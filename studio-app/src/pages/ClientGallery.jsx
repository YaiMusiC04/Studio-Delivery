import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ClientGallery({ profile }) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchDeliveries() }, [])

  const fetchDeliveries = async () => {
    const { data } = await supabase.from('deliveries').select('*')
      .eq('client_id', profile.id).order('created_at', { ascending: false })
    setDeliveries(data || [])
    setLoading(false)
  }

  const getSignedUrl = async (path) => {
    const { data } = await supabase.storage.from('deliveries').createSignedUrl(path, 3600)
    return data?.signedUrl
  }

  const openLightbox = async (delivery) => {
    const url = await getSignedUrl(delivery.storage_path)
    setLightbox({ ...delivery, url })
    if (!delivery.viewed) {
      await supabase.from('deliveries').update({ viewed: true }).eq('id', delivery.id)
      setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, viewed: true } : d))
    }
  }

  const handleDownload = async (delivery) => {
    const url = await getSignedUrl(delivery.storage_path)
    if (url) { const a = document.createElement('a'); a.href = url; a.download = delivery.file_name; a.click() }
  }

  const filtered = filter === 'all' ? deliveries : deliveries.filter(d => d.file_type === filter)
  const photos = filtered.filter(d => d.file_type === 'photo')
  const nonPhotos = filtered.filter(d => d.file_type !== 'photo')
  const newCount = deliveries.filter(d => !d.viewed).length

  const SignedImage = ({ path, alt, style, onClick }) => {
    const [url, setUrl] = useState(null)
    useEffect(() => { getSignedUrl(path).then(setUrl) }, [path])
    if (!url) return <div style={{ ...style, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-mute)', fontSize:11, minHeight:120 }}>Loading...</div>
    return <img src={url} alt={alt} style={style} onClick={onClick} loading="lazy" />
  }

  return (
    <>
      <style>{`
        .client-page { min-height:100vh; background:var(--bg); }
        .client-header { background:var(--bg2); border-bottom:1px solid var(--border); padding:0 36px; display:flex; align-items:center; justify-content:space-between; height:64px; }
        .header-logo { font-family:var(--font-display); font-size:20px; font-weight:300; letter-spacing:0.06em; }
        .header-right { display:flex; align-items:center; gap:16px; }
        .header-user { font-size:12px; color:var(--text-dim); }
        .logout-btn { font-size:11px; color:var(--text-mute); cursor:pointer; background:none; border:none; letter-spacing:0.05em; transition:color var(--transition); }
        .logout-btn:hover { color:var(--red); }
        .client-hero { background:linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%); padding:52px 36px 40px; border-bottom:1px solid var(--border); }
        .hero-greeting { font-size:11px; color:var(--gold); letter-spacing:0.2em; text-transform:uppercase; font-weight:600; }
        .hero-name { font-family:var(--font-display); font-size:48px; font-weight:300; letter-spacing:0.03em; margin-top:6px; line-height:1; }
        .hero-sub { font-size:14px; color:var(--text-dim); margin-top:10px; }
        .client-content { padding:40px 36px; }
        .filter-bar { display:flex; gap:8px; margin-bottom:32px; }
        .filter-btn { padding:8px 18px; border-radius:20px; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; transition:all var(--transition); background:transparent; border:1px solid var(--border); color:var(--text-dim); font-family:var(--font-ui); }
        .filter-btn:hover { border-color:var(--border-hover); color:var(--text); }
        .filter-btn.active { background:var(--gold); border-color:var(--gold); color:#000; }
        .section-title { font-family:var(--font-display); font-size:24px; font-weight:300; letter-spacing:0.04em; margin-bottom:20px; }
        .photo-gallery { columns:3; gap:14px; margin-bottom:40px; }
        @media(max-width:768px) { .photo-gallery { columns:2; } }
        @media(max-width:480px) { .photo-gallery { columns:1; } }
        .photo-item { break-inside:avoid; margin-bottom:14px; position:relative; cursor:pointer; border-radius:var(--radius-lg); overflow:hidden; border:1px solid var(--border); animation:fadeIn 0.5s ease both; }
        .photo-item:hover img { transform:scale(1.03); }
        .photo-item img { display:block; width:100%; transition:transform 0.4s ease; }
        .photo-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 50%); opacity:0; transition:opacity 0.3s ease; display:flex; align-items:flex-end; justify-content:space-between; padding:16px; }
        .photo-item:hover .photo-overlay { opacity:1; }
        .photo-name { font-size:11px; font-weight:500; letter-spacing:0.05em; color:#fff; }
        .photo-size { font-size:10px; color:rgba(255,255,255,0.6); margin-top:2px; }
        .photo-dl { background:var(--gold); color:#000; border:none; border-radius:var(--radius); padding:7px 12px; font-size:10px; font-weight:700; cursor:pointer; letter-spacing:0.05em; flex-shrink:0; }
        .new-dot { position:absolute; top:12px; right:12px; width:10px; height:10px; background:var(--gold); border-radius:50%; box-shadow:0 0 10px var(--gold); animation:pulse 2s ease infinite; }
        .files-list { display:flex; flex-direction:column; gap:10px; margin-bottom:40px; }
        .file-row { display:flex; align-items:center; gap:16px; background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius-lg); padding:18px 22px; animation:slideIn 0.4s ease both; }
        .file-icon { width:44px; height:44px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .file-icon-video { background:rgba(224,92,92,0.1); }
        .file-icon-audio { background:rgba(92,224,168,0.1); }
        .file-info { flex:1; }
        .file-name-text { font-size:14px; font-weight:600; }
        .file-meta { font-size:11px; color:var(--text-dim); margin-top:4px; }
        .btn-gold { display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:var(--radius); font-family:var(--font-ui); font-size:12px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; cursor:pointer; transition:all var(--transition); border:none; background:var(--gold); color:#000; }
        .btn-gold:hover { background:var(--gold2); }
        .file-new { font-size:9px; letter-spacing:0.1em; text-transform:uppercase; padding:3px 8px; border-radius:20px; font-weight:700; background:rgba(201,169,110,0.15); color:var(--gold); margin-right:8px; }
        .empty-state { text-align:center; padding:80px 0; color:var(--text-mute); }
        .empty-icon { font-size:40px; margin-bottom:16px; opacity:0.3; }
        .empty-text { font-family:var(--font-display); font-size:22px; font-weight:300; margin-bottom:8px; color:var(--text-dim); }
        .empty-sub { font-size:13px; }
        .lightbox { position:fixed; inset:0; background:rgba(0,0,0,0.97); z-index:200; display:flex; align-items:center; justify-content:center; cursor:zoom-out; animation:fadeIn 0.2s ease; }
        .lightbox img { max-width:92vw; max-height:92vh; object-fit:contain; border-radius:var(--radius-lg); }
        .lightbox-close { position:absolute; top:24px; right:24px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1); color:var(--text); width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; }
        .lightbox-info { position:absolute; bottom:28px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); border:1px solid var(--border); border-radius:20px; padding:10px 22px; font-size:12px; color:var(--text-dim); display:flex; gap:20px; white-space:nowrap; }
        .lightbox-dl { background:var(--gold); color:#000; border:none; border-radius:var(--radius); padding:8px 16px; font-size:11px; font-weight:700; cursor:pointer; letter-spacing:0.05em; }
      `}</style>

      <div className="client-page">
        <header className="client-header">
          <div className="header-logo">STUDIO</div>
          <div className="header-right">
            <span className="header-user">{profile.name}</span>
            <button className="logout-btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </header>

        <div className="client-hero">
          <div className="hero-greeting">Welcome back</div>
          <div className="hero-name">{profile.name.split(' ')[0]}</div>
          <div className="hero-sub">
            {loading ? 'Loading your gallery...'
              : newCount > 0
                ? `You have ${newCount} new file${newCount > 1 ? 's' : ''} ready to view.`
                : deliveries.length > 0
                  ? `All ${deliveries.length} files are up to date.`
                  : 'Your gallery is waiting for its first delivery.'}
          </div>
        </div>

        <div className="client-content">
          {!loading && deliveries.length > 0 && (
            <div className="filter-bar">
              {['all','photo','video','audio'].map(f => (
                <button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
                  {f==='all'?`All (${deliveries.length})`:f.charAt(0).toUpperCase()+f.slice(1)+'s'}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:'center', padding:'80px 0', color:'var(--text-mute)' }}>
              <div style={{ width:28, height:28, border:'2px solid var(--border)', borderTop:'2px solid var(--gold)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
              Loading your files...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <div className="empty-text">Your gallery is empty</div>
              <div className="empty-sub">Your artist will deliver files here soon.</div>
            </div>
          ) : (
            <>
              {photos.length > 0 && (
                <>
                  <div className="section-title">Photography</div>
                  <div className="photo-gallery">
                    {photos.map((d, i) => (
                      <div key={d.id} className="photo-item" style={{ animationDelay:`${i*0.07}s` }}>
                        {!d.viewed && <div className="new-dot" />}
                        <SignedImage path={d.storage_path} alt={d.file_name} style={{ display:'block', width:'100%' }} />
                        <div className="photo-overlay">
                          <div>
                            <div className="photo-name">{d.file_name}</div>
                            <div className="photo-size">{d.file_size}</div>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                            <button className="photo-dl" onClick={e => { e.stopPropagation(); openLightbox(d) }}>View</button>
                            <button className="photo-dl" style={{ background:'rgba(255,255,255,0.15)', color:'#fff' }} onClick={e => { e.stopPropagation(); handleDownload(d) }}>↓ Save</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {nonPhotos.length > 0 && (
                <>
                  <div className="section-title">Video & Audio</div>
                  <div className="files-list">
                    {nonPhotos.map((d, i) => (
                      <div key={d.id} className="file-row" style={{ animationDelay:`${i*0.06}s` }}>
                        <div className={`file-icon file-icon-${d.file_type}`}>{d.file_type==='video'?'▶':'♪'}</div>
                        <div className="file-info">
                          <div className="file-name-text">{d.file_name}</div>
                          <div className="file-meta">{d.file_size} · Delivered {d.created_at?.split('T')[0]}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center' }}>
                          {!d.viewed && <span className="file-new">New</span>}
                          <button className="btn-gold" onClick={() => handleDownload(d)}>↓ Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>×</button>
          {lightbox.url && <img src={lightbox.url} alt={lightbox.file_name} onClick={e=>e.stopPropagation()} />}
          <div className="lightbox-info">
            <span>{lightbox.file_name}</span>
            <span>·</span>
            <span>{lightbox.file_size}</span>
            <span>·</span>
            <button className="lightbox-dl" onClick={() => handleDownload(lightbox)}>↓ Download Full Quality</button>
          </div>
        </div>
      )}
    </>
  )
}
