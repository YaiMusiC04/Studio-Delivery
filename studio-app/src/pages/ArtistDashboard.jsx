import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ArtistDashboard({ profile }) {
  const [clients, setClients] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])
  const [uploadClientId, setUploadClientId] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef()

  useEffect(() => { fetchClients(); fetchDeliveries() }, [])

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').eq('artist_id', profile.id)
    setClients(data || [])
  }

  const fetchDeliveries = async () => {
    const { data } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false })
    setDeliveries(data || [])
  }

  const showToast = (msg, icon = '✓') => {
    setToast({ msg, icon })
    setTimeout(() => setToast(null), 3500)
  }

  const handleUpload = async () => {
    if (!uploadClientId || uploadFiles.length === 0) return
    setUploading(true); setUploadProgress(0)
    const client = clients.find(c => c.id === uploadClientId)
    let done = 0
    for (const file of uploadFiles) {
      const ext = file.name.split('.').pop()
      const path = `${uploadClientId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: storageError } = await supabase.storage.from('deliveries').upload(path, file, { upsert: false })
      if (!storageError) {
        const typeMap = { 'image': 'photo', 'video': 'video', 'audio': 'audio' }
        const fileType = typeMap[file.type.split('/')[0]] || 'photo'
        const size = file.size > 1e9 ? `${(file.size/1e9).toFixed(1)} GB` : `${(file.size/1e6).toFixed(1)} MB`
        await supabase.from('deliveries').insert({
          client_id: uploadClientId,
          client_email: client?.email,
          artist_id: profile.id,
          file_name: file.name,
          file_type: fileType,
          file_size: size,
          storage_path: path,
          viewed: false
        })
      }
      done++
      setUploadProgress(Math.round((done / uploadFiles.length) * 100))
    }
    await fetchDeliveries()
    setUploading(false); setShowUpload(false); setUploadFiles([]); setUploadClientId('')
    showToast(`${uploadFiles.length} file${uploadFiles.length > 1 ? 's' : ''} delivered!`, '↑')
  }

  const handleAddClient = async (e) => {
    e.preventDefault()
    setAddingClient(true)
    const { error } = await supabase.from('clients').insert({
      artist_id: profile.id,
      name: newClientName,
      email: newClientEmail
    })
    if (!error) {
      await fetchClients()
      showToast(`${newClientName} added!`, '✓')
      setShowAddClient(false); setNewClientName(''); setNewClientEmail('')
    } else {
      showToast('Error adding client. Try again.', '✗')
    }
    setAddingClient(false)
  }

  const getSignedUrl = async (path) => {
    const { data } = await supabase.storage.from('deliveries').createSignedUrl(path, 3600)
    return data?.signedUrl
  }

  const openLightbox = async (delivery) => {
    const url = await getSignedUrl(delivery.storage_path)
    setLightbox({ ...delivery, url })
    await supabase.from('deliveries').update({ viewed: true }).eq('id', delivery.id)
    setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, viewed: true } : d))
  }

  const handleDownload = async (delivery) => {
    const url = await getSignedUrl(delivery.storage_path)
    if (url) { const a = document.createElement('a'); a.href = url; a.download = delivery.file_name; a.click() }
  }
  const handleDelete = async (delivery) => {
    if (!confirm(`Delete ${delivery.file_name}?`)) return
    await supabase.storage.from('deliveries').remove([delivery.storage_path])
    await supabase.from('deliveries').delete().eq('id', delivery.id)
    setDeliveries(prev => prev.filter(d => d.id !== delivery.id))
    showToast('File deleted', '✕')

  const clientDeliveries = (clientId) => deliveries.filter(d => d.client_id === clientId)
  const filteredDeliveries = (clientId) => {
    const cd = clientDeliveries(clientId)
    return filter === 'all' ? cd : cd.filter(d => d.file_type === filter)
  }
  const photos = (clientId) => filteredDeliveries(clientId).filter(d => d.file_type === 'photo')
  const nonPhotos = (clientId) => filteredDeliveries(clientId).filter(d => d.file_type !== 'photo')
  const totalNew = deliveries.filter(d => !d.viewed).length

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    setUploadFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])
  }

  const SignedImage = ({ path, alt, style, onClick }) => {
    const [url, setUrl] = useState(null)
    useEffect(() => { getSignedUrl(path).then(setUrl) }, [path])
    if (!url) return <div style={{ ...style, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-mute)', fontSize:11, minHeight:120 }}>Loading...</div>
    return <img src={url} alt={alt} style={style} onClick={onClick} />
  }

  return (
    <>
      <style>{`
        .app { display:flex; height:100vh; }
        .sidebar { width:260px; min-width:260px; background:var(--bg2); border-right:1px solid var(--border); display:flex; flex-direction:column; }
        .logo-wrap { padding:32px 28px 24px; border-bottom:1px solid var(--border); }
        .logo-name { font-family:var(--font-display); font-size:22px; font-weight:300; letter-spacing:0.06em; }
        .logo-tag { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-top:5px; font-weight:500; }
        .nav { padding:20px 0; flex:1; overflow-y:auto; }
        .nav-label { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:var(--text-mute); padding:0 28px 10px; font-weight:600; }
        .nav-item { display:flex; align-items:center; gap:12px; padding:11px 28px; cursor:pointer; font-size:13px; font-weight:500; letter-spacing:0.02em; color:var(--text-dim); transition:all var(--transition); position:relative; border:none; background:none; width:100%; text-align:left; }
        .nav-item:hover { color:var(--text); background:rgba(255,255,255,0.03); }
        .nav-item.active { color:var(--gold); }
        .nav-item.active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:2px; height:20px; background:var(--gold); border-radius:0 2px 2px 0; }
        .nav-badge { margin-left:auto; background:var(--gold); color:#000; font-size:9px; font-weight:700; padding:2px 6px; border-radius:20px; }
        .sidebar-user { padding:20px 28px; border-top:1px solid var(--border); display:flex; align-items:center; gap:12px; }
        .avatar { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,var(--gold),var(--gold2)); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#000; flex-shrink:0; }
        .main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .topbar { height:64px; padding:0 36px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; background:var(--bg2); flex-shrink:0; }
        .topbar-title { font-family:var(--font-display); font-size:26px; font-weight:300; letter-spacing:0.04em; }
        .topbar-sub { font-size:11px; color:var(--text-dim); margin-top:2px; letter-spacing:0.05em; }
        .content { flex:1; overflow-y:auto; padding:36px; animation:fadeIn 0.4s ease; }
        .btn { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; border-radius:var(--radius); font-family:var(--font-ui); font-size:12px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; cursor:pointer; transition:all var(--transition); border:none; }
        .btn-gold { background:var(--gold); color:#000; }
        .btn-gold:hover { background:var(--gold2); transform:translateY(-1px); box-shadow:0 4px 20px rgba(201,169,110,0.3); }
        .btn-outline { background:transparent; color:var(--text-dim); border:1px solid var(--border); }
        .btn-outline:hover { border-color:var(--border-hover); color:var(--text); }
        .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:36px; }
        .stat-card { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius-lg); padding:22px 24px; animation:fadeIn 0.5s ease both; }
        .stat-label { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:var(--text-mute); font-weight:600; }
        .stat-value { font-family:var(--font-display); font-size:38px; font-weight:300; color:var(--text); margin-top:6px; line-height:1; }
        .stat-delta { font-size:11px; color:var(--green); margin-top:6px; }
        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .section-title { font-family:var(--font-display); font-size:22px; font-weight:300; letter-spacing:0.04em; }
        .clients-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .client-card { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; cursor:pointer; transition:all var(--transition); position:relative; overflow:hidden; animation:fadeIn 0.5s ease both; }
        .client-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--gold),transparent); opacity:0; transition:opacity var(--transition); }
        .client-card:hover { border-color:var(--border-hover); transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .client-card:hover::after { opacity:1; }
        .client-card-header { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
        .client-name { font-size:15px; font-weight:600; }
        .client-email { font-size:11px; color:var(--text-dim); margin-top:2px; }
        .client-stats { display:flex; gap:20px; }
        .client-stat { font-size:11px; color:var(--text-dim); }
        .client-stat strong { display:block; font-size:18px; font-family:var(--font-display); font-weight:300; color:var(--text); }
        .new-badge { position:absolute; top:16px; right:16px; background:var(--gold); color:#000; font-size:8px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; padding:3px 8px; border-radius:2px; animation:pulse 2s ease infinite; }
        .back-btn { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-dim); font-weight:600; background:none; border:none; padding:0; margin-bottom:16px; transition:color var(--transition); }
        .back-btn:hover { color:var(--gold); }
        .filter-bar { display:flex; gap:8px; margin-bottom:28px; }
        .filter-btn { padding:8px 16px; border-radius:20px; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; transition:all var(--transition); background:transparent; border:1px solid var(--border); color:var(--text-dim); font-family:var(--font-ui); }
        .filter-btn:hover { border-color:var(--border-hover); color:var(--text); }
        .filter-btn.active { background:var(--gold); border-color:var(--gold); color:#000; }
        .photo-gallery { columns:3; gap:12px; margin-bottom:36px; }
        .photo-item { break-inside:avoid; margin-bottom:12px; position:relative; cursor:pointer; border-radius:var(--radius-lg); overflow:hidden; border:1px solid var(--border); animation:fadeIn 0.5s ease both; }
        .photo-item img { display:block; width:100%; transition:transform 0.4s ease; }
        .photo-item:hover img { transform:scale(1.03); }
        .photo-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 50%); opacity:0; transition:opacity var(--transition); display:flex; align-items:flex-end; padding:16px; }
        .photo-item:hover .photo-overlay { opacity:1; }
        .photo-name { font-size:11px; font-weight:500; letter-spacing:0.05em; color:#fff; }
        .photo-size { font-size:10px; color:rgba(255,255,255,0.6); margin-top:2px; }
        .photo-unviewed::after { content:''; position:absolute; top:10px; right:10px; width:8px; height:8px; background:var(--gold); border-radius:50%; box-shadow:0 0 8px var(--gold); }
        .files-list { display:flex; flex-direction:column; gap:8px; }
        .file-row { display:flex; align-items:center; gap:16px; background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px 20px; transition:all var(--transition); animation:slideIn 0.4s ease both; }
        .file-row:hover { border-color:var(--border-hover); background:var(--bg3); }
        .file-icon { width:40px; height:40px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .file-icon-video { background:rgba(224,92,92,0.1); }
        .file-icon-audio { background:rgba(92,224,168,0.1); }
        .file-info { flex:1; }
        .file-name-text { font-size:13px; font-weight:600; }
        .file-meta { font-size:11px; color:var(--text-dim); margin-top:3px; }
        .file-status { font-size:9px; letter-spacing:0.1em; text-transform:uppercase; padding:3px 8px; border-radius:20px; font-weight:700; }
        .file-status-new { background:rgba(201,169,110,0.15); color:var(--gold); }
        .file-status-seen { background:rgba(255,255,255,0.05); color:var(--text-mute); }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:100; display:flex; align-items:center; justify-content:center; animation:fadeIn 0.2s ease; }
        .modal { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius-lg); width:520px; max-width:95vw; padding:36px; animation:fadeIn 0.3s ease; max-height:90vh; overflow-y:auto; }
        .modal-title { font-family:var(--font-display); font-size:28px; font-weight:300; margin-bottom:6px; }
        .modal-sub { font-size:12px; color:var(--text-dim); margin-bottom:28px; letter-spacing:0.03em; }
        .form-group { margin-bottom:20px; }
        .form-label { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:var(--text-dim); font-weight:600; margin-bottom:8px; display:block; }
        .form-select, .form-input { width:100%; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); padding:12px 14px; font-family:var(--font-ui); font-size:13px; color:var(--text); transition:border-color var(--transition); outline:none; appearance:none; }
        .form-select:focus, .form-input:focus { border-color:var(--gold); }
        .drop-zone { border:1px dashed var(--border); border-radius:var(--radius-lg); padding:40px 24px; text-align:center; cursor:pointer; transition:all var(--transition); }
        .drop-zone:hover, .drop-zone.drag-over { border-color:var(--gold); background:rgba(201,169,110,0.04); }
        .drop-icon { font-size:32px; margin-bottom:12px; opacity:0.6; }
        .drop-text { font-size:14px; color:var(--text-dim); }
        .drop-strong { color:var(--gold); }
        .drop-formats { font-size:10px; color:var(--text-mute); margin-top:6px; letter-spacing:0.05em; }
        .selected-files { margin-top:16px; display:flex; flex-direction:column; gap:6px; }
        .selected-file { display:flex; align-items:center; gap:10px; background:var(--bg3); border-radius:var(--radius); padding:10px 14px; font-size:12px; }
        .selected-file-name { flex:1; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .selected-file-size { color:var(--text-mute); font-size:11px; flex-shrink:0; }
        .remove-file { cursor:pointer; color:var(--text-mute); font-size:14px; transition:color var(--transition); background:none; border:none; flex-shrink:0; }
        .remove-file:hover { color:var(--red); }
        .modal-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:28px; }
        .progress-bar { height:3px; background:var(--bg4); border-radius:2px; margin-top:12px; overflow:hidden; }
        .progress-fill { height:100%; background:var(--gold); border-radius:2px; transition:width 0.3s ease; }
        .lightbox { position:fixed; inset:0; background:rgba(0,0,0,0.96); z-index:200; display:flex; align-items:center; justify-content:center; cursor:zoom-out; animation:fadeIn 0.2s ease; }
        .lightbox img { max-width:90vw; max-height:90vh; object-fit:contain; border-radius:var(--radius-lg); }
        .lightbox-close { position:absolute; top:24px; right:24px; background:rgba(255,255,255,0.1); border:1px solid var(--border); color:var(--text); width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; transition:background var(--transition); }
        .lightbox-close:hover { background:rgba(255,255,255,0.2); }
        .lightbox-info { position:absolute; bottom:28px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); border:1px solid var(--border); border-radius:20px; padding:10px 20px; font-size:12px; color:var(--text-dim); letter-spacing:0.05em; display:flex; gap:20px; white-space:nowrap; }
        .toast { position:fixed; bottom:28px; right:28px; z-index:300; background:var(--bg3); border:1px solid var(--gold); border-radius:var(--radius-lg); padding:14px 20px; display:flex; align-items:center; gap:12px; font-size:13px; animation:slideIn 0.3s ease; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
        .logout-btn { font-size:11px; color:var(--text-mute); cursor:pointer; background:none; border:none; letter-spacing:0.05em; transition:color var(--transition); }
        .logout-btn:hover { color:var(--red); }
        .info-box { background:rgba(201,169,110,0.08); border:1px solid rgba(201,169,110,0.2); border-radius:var(--radius); padding:12px 14px; font-size:12px; color:var(--gold); margin-bottom:20px; }
      `}</style>

      <div className="app">
        <div className="sidebar">
          <div className="logo-wrap">
            <div className="logo-name">STUDIO</div>
            <div className="logo-tag">Creative Delivery</div>
          </div>
          <nav className="nav">
            <div className="nav-label">Workspace</div>
            <button className={`nav-item ${!selectedClient ? 'active' : ''}`} onClick={() => setSelectedClient(null)}>
              ⌂ Dashboard
              {totalNew > 0 && <span className="nav-badge">{totalNew}</span>}
            </button>
            <button className="nav-item" onClick={() => setShowUpload(true)}>↑ Send Files</button>
            <button className="nav-item" onClick={() => setShowAddClient(true)}>+ Add Client</button>
          </nav>
          <div className="sidebar-user">
            <div className="avatar">{profile.name?.slice(0,2).toUpperCase()}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile.name}</div>
              <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:2 }}>Artist</div>
            </div>
            <button className="logout-btn" onClick={() => supabase.auth.signOut()}>Out</button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div>
              <div className="topbar-title">{selectedClient ? selectedClient.name : 'Dashboard'}</div>
              <div className="topbar-sub">{selectedClient ? `${clientDeliveries(selectedClient.id).length} files delivered` : 'Artist workspace'}</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-gold" onClick={() => { if(selectedClient) setUploadClientId(selectedClient.id); setShowUpload(true) }}>↑ Send Files</button>
            </div>
          </div>

          <div className="content">
            {!selectedClient ? (
              <>
                <div className="stats-grid">
                  {[
                    { label:'Total Clients', value: clients.length, delta:'Active clients' },
                    { label:'Files Delivered', value: deliveries.length, delta:'All time' },
                    { label:'Unseen Files', value: totalNew, delta:'Awaiting review' },
                    { label:'Photos', value: deliveries.filter(d=>d.file_type==='photo').length, delta:'Delivered' },
                  ].map((s, i) => (
                    <div className="stat-card" key={i} style={{ animationDelay:`${i*0.08}s` }}>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-delta">{s.delta}</div>
                    </div>
                  ))}
                </div>
                <div className="section-header">
                  <div className="section-title">Your Clients</div>
                  <button className="btn btn-outline" onClick={() => setShowAddClient(true)}>+ Add Client</button>
                </div>
                {clients.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-mute)', fontSize:14 }}>
                    No clients yet. Add your first client to get started.
                  </div>
                ) : (
                  <div className="clients-grid">
                    {clients.map((c, i) => {
                      const cd = clientDeliveries(c.id)
                      const newCount = cd.filter(d => !d.viewed).length
                      return (
                        <div className="client-card" key={c.id} style={{ animationDelay:`${i*0.1}s` }} onClick={() => setSelectedClient(c)}>
                          {newCount > 0 && <div className="new-badge">{newCount} New</div>}
                          <div className="client-card-header">
                            <div className="avatar" style={{ width:32, height:32, fontSize:10 }}>{c.name?.slice(0,2).toUpperCase()}</div>
                            <div>
                              <div className="client-name">{c.name}</div>
                              <div className="client-email">{c.email}</div>
                            </div>
                          </div>
                          <div className="client-stats">
                            <div className="client-stat"><strong>{cd.length}</strong>Files</div>
                            <div className="client-stat"><strong>{cd.filter(d=>d.file_type==='photo').length}</strong>Photos</div>
                            <div className="client-stat"><strong>{cd.filter(d=>d.file_type==='video').length}</strong>Videos</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <button className="back-btn" onClick={() => setSelectedClient(null)}>← Back</button>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div className="filter-bar">
                    {['all','photo','video','audio'].map(f => (
                      <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
                        {f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1)+'s'}
                      </button>
                    ))}
                  </div>
                </div>
                {photos(selectedClient.id).length > 0 && (
                  <>
                    <div className="section-header"><div className="section-title">Photography</div></div>
                    <div className="photo-gallery">
                      {photos(selectedClient.id).map((d, i) => (
                        <div key={d.id} className={`photo-item ${!d.viewed?'photo-unviewed':''}`} style={{ animationDelay:`${i*0.07}s` }} onClick={() => openLightbox(d)}>
                          <SignedImage path={d.storage_path} alt={d.file_name} style={{ display:'block', width:'100%' }} />
                          <div className="photo-overlay">
                            <div><div className="photo-name">{d.file_name}</div><div className="photo-size">{d.file_size}</div></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {nonPhotos(selectedClient.id).length > 0 && (
                  <>
                    <div className="section-header"><div className="section-title">Video & Audio</div></div>
                    <div className="files-list">
                      {nonPhotos(selectedClient.id).map((d, i) => (
                        <div key={d.id} className="file-row" style={{ animationDelay:`${i*0.06}s` }}>
                          <div className={`file-icon file-icon-${d.file_type}`}>{d.file_type==='video'?'▶':'♪'}</div>
                          <div className="file-info">
                            <div className="file-name-text">{d.file_name}</div>
                            <div className="file-meta">{d.file_size} · {d.created_at?.split('T')[0]}</div>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <span className={`file-status ${!d.viewed?'file-status-new':'file-status-seen'}`}>{!d.viewed?'New':'Seen'}</span>
                            <button className="btn btn-outline" style={{ padding:'7px 14px' }} onClick={() => handleDownload(d)}>↓</button>
                            <button className="btn btn-outline" style={{ padding:'7px 14px', color:'var(--red)', borderColor:'rgba(224,92,92,0.5)' }} onClick={() => handleDelete(d)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {filteredDeliveries(selectedClient.id).length === 0 && (
                  <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-mute)', fontSize:14 }}>
                    No files yet. Click "Send Files" to deliver content.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showUpload && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowUpload(false)}>
          <div className="modal">
            <div className="modal-title">Send Files</div>
            <div className="modal-sub">Delivered instantly to your client's private gallery — no quality loss</div>
            <div className="form-group">
              <label className="form-label">Client</label>
              <select className="form-select" value={uploadClientId} onChange={e => setUploadClientId(e.target.value)}>
                <option value="">Select a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Files</label>
              <div className={`drop-zone ${dragOver?'drag-over':''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}>
                <div className="drop-icon">⊕</div>
                <div className="drop-text">Drop files here or <span className="drop-strong">browse</span></div>
                <div className="drop-formats">JPG · RAW · PNG · MP4 · MOV · MP3 · WAV · No quality loss</div>
              </div>
              <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*" style={{ display:'none' }}
                onChange={e => setUploadFiles(prev => [...prev, ...Array.from(e.target.files)])} />
              {uploadFiles.length > 0 && (
                <div className="selected-files">
                  {uploadFiles.map((f, i) => (
                    <div key={i} className="selected-file">
                      <span>{f.type.startsWith('image')?'▣':f.type.startsWith('video')?'▶':'♪'}</span>
                      <span className="selected-file-name">{f.name}</span>
                      <span className="selected-file-size">{f.size>1e9?`${(f.size/1e9).toFixed(1)} GB`:`${(f.size/1e6).toFixed(1)} MB`}</span>
                      <button className="remove-file" onClick={() => setUploadFiles(prev => prev.filter((_,j)=>j!==i))}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {uploading && <div className="progress-bar"><div className="progress-fill" style={{ width:`${uploadProgress}%` }} /></div>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowUpload(false); setUploadFiles([]) }}>Cancel</button>
              <button className="btn btn-gold" onClick={handleUpload} disabled={!uploadClientId||uploadFiles.length===0||uploading}
                style={{ opacity:(!uploadClientId||uploadFiles.length===0||uploading)?0.5:1 }}>
                {uploading ? `Uploading ${uploadProgress}%...` : `↑ Deliver ${uploadFiles.length>0?uploadFiles.length+' File'+(uploadFiles.length>1?'s':''):'Files'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddClient && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowAddClient(false)}>
          <div className="modal" style={{ maxWidth:440 }}>
            <div className="modal-title">Add Client</div>
            <div className="modal-sub">Add a client to start delivering files to their gallery</div>
            <form onSubmit={handleAddClient}>
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input className="form-input" type="text" value={newClientName} onChange={e=>setNewClientName(e.target.value)} placeholder="Isabella Moreno" required />
              </div>
              <div className="form-group">
                <label className="form-label">Client Email</label>
                <input className="form-input" type="email" value={newClientEmail} onChange={e=>setNewClientEmail(e.target.value)} placeholder="isabella@email.com" required />
              </div>
              <div className="info-box">
                💡 Share <strong>studio-delivery.vercel.app</strong> with your client so they can create their account and see their gallery.
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddClient(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold" disabled={addingClient}>
                  {addingClient ? 'Adding...' : '+ Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>×</button>
          {lightbox.url && <img src={lightbox.url} alt={lightbox.file_name} onClick={e=>e.stopPropagation()} />}
          <div className="lightbox-info">
            <span>{lightbox.file_name}</span><span>·</span><span>{lightbox.file_size}</span>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span style={{ fontSize:16 }}>{toast.icon}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  )
}
