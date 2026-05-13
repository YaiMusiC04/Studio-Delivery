module.exports = function handler(req, res) {
  const vars = Object.keys(process.env)
    .filter(k => !k.startsWith('npm_') && !k.startsWith('VERCEL_GIT'))
    .sort()

  res.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    nodeVersion: process.version,
    customVars: vars,
  })
}
