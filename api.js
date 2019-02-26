const bodyParser = require('body-parser');
const path = require('path')
const fs = require('fs')

const name = 'validation'
var settingsPath = null

var stats = {
  initialized: false,
  status: 'nok',
  validateAction: 'none'
}

function init(app, apiToExpose, persistenceDir) {
  settingsPath = path.join(persistenceDir, name)
  try {
    fs.mkdirSync(settingsPath, { recursive: true })
  } catch(e){}
  settingsPath = path.join(settingsPath, 'settings.json')
  syncStats()

  app.use(apiToExpose, bodyParser.urlencoded({ extended: true }));
  app.get(apiToExpose, function(req, res){
    syncStats()
    res.json(stats)
  });

  app.post(apiToExpose, function(req, res){
    syncStats()
    res.json(stats)
  });
}

function syncStats(){
  if(!settingsPath){
    return
  }
  try {
    stats = JSON.parse(fs.readFileSync(settingsPath))
  } catch(e){
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(stats, null, 4), { encoding: 'utf8'})
    } catch(e){}
  }
  if(stats.initialized === false){
    stats.initialized = true
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(stats, null, 4), { encoding: 'utf8'})
    } catch(e){}
  }
}

function getStats(){
  return stats
}

module.exports = {
  init: init,
  getStats: getStats,
  syncStats: syncStats,
  order: 999999,
  canIgnore: false
}
