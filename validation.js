_wizard_view_validation_index = params.views.findIndex(v => v.name === 'validation')

ejs.renderFile(
  params.views[_wizard_view_validation_index].ejs,
  Object.assign({
    viewIndex: _wizard_view_validation_index
  }, params),
  { async: false },
  (_err, _str) => {
    document.getElementById('wizard_validation').innerHTML = _str

    var view_li = document.getElementsByClassName(`tab_${params.views[_wizard_view_validation_index].order}`);
    if(view_li.length > 0){
      view_li[0].addEventListener('click', function(){
        validation_reload_view()
      });
    }
  }
)

var validation_on_validate_needTo = 'none'
var validationLocked = []

params.views[_wizard_view_validation_index].validate = function(){
  if(params.views.filter(v => v.isOk() === false && form_params[v.name].ignore !== true).length > 0){
    return
  }
  validationLockAction()
  document.getElementById('validation_please_wait').classList.add('is-visible')

  var promises = []
  var promisesIndex = []

  for(var i in params.views){
    if(i != _wizard_view_validation_index && typeof params.views[i].post === 'function' && form_params[params.views[i].name].ignore !== true){
      promises.push(params.views[i].post().then(resp => Object.assign({ success: true, data: resp })).catch(err => Object.assign({ success: false, data: err })))
      promisesIndex.push(i)
    }
  }

  Promise.all(promises).then( datas => {
    datas = datas.map( (d, i) => {
      return {
        index: promisesIndex[i],
        data: d.data,
        success: d.success
      }
    })
    var _done = datas.filter( d => d.success === true)
    var _fail = datas.filter( d => d.success === false)

    if(_fail.length !== 0){
      for(var i in _fail){
        var _msg = ''
        if(isObject(_fail[i].data) && _fail[i].data.hasOwnProperty('message')){
          _msg = _fail[i].data.message
        } else {
          _msg = `An error occured validating the ${params.views[_fail[i].index].name}`
        }
        M.toast({html: `<b>Error: ${_msg}</b><button onclick="M.Toast.getInstance(document.querySelector('.toast_e${i}')).dismiss()" style="margin-left: 16px;font-weight:500; margin-right:-14px;" class="btn-flat blue-grey darken-1 white-text">Ok</button>`, displayLength: 500000, classes: `toast_e${i} ttb-color-orange`})
      }
      setTimeout(()=> {
        validationUnlockAction()
      }, 1000)
    } else {
      for(var i in _done){
        var _msg = ''
        if(isObject(_done[i].data) && _done[i].data.hasOwnProperty('message')){
          _msg = _done[i].data.message
        } else {
          _msg = `The ${params.views[_done[i].index].name} was successfully validated`
        }
        M.toast({html: `<b>${_msg}</b><button onclick="M.Toast.getInstance(document.querySelector('.toast_e${i}')).dismiss()" style="margin-left: 16px;font-weight:500; margin-right:-14px;" class="btn-flat blue-grey darken-1 white-text">Ok</button>`, displayLength: 500000, classes: `toast_e${i} ttb-color-green blue-grey-text text-darken-1`})
      }
      var _needToSentence = ''
      if(validation_on_validate_needTo === 'none'){
        _needToSentence = ''
      } else if(validation_on_validate_needTo === 'restart'){
        _needToSentence = 'The device has to restart some application.<br> The operation can take a minute.<br>'
      } else {
        _needToSentence = 'The device has to restart himself.<br> The operation can take up to five minutes.<br>'
      }
      M.toast({html: `<b>All settings was successfully set.<br>${_needToSentence}You will be redirected as soon as possible.</b>`, displayLength: 500000, classes: `ttb-color-green blue-grey-text text-darken-1`})
      if(validation_on_validate_needTo === 'none'){
        setTimeout( () => {
          window.location = '/'
        }, 3000)
      } else if(validation_on_validate_needTo === 'restart'){
        restart()
      } else if(validation_on_validate_needTo === 'reboot'){
        restart(true)
      }
    }
  });
}

function validationLockAction(){
  document.getElementById('wizard_validation_form_validate').classList.add('disabled')
  for(var i in params.views){
    var _done = disableView(params.views[i].order)
    if(_done === true){
      validationLocked.push(params.views[i].order)
    }
  }
}

function validationUnlockAction(){
  for(var i in validationLocked){
    enableView(validationLocked[i])
  }
  validationLocked = []
  document.getElementById('wizard_validation_form_validate').classList.remove('disabled')
  validation_reload_view()
}

function validation_reload_view(){
  if(validationLocked.length > 0) {
    return
  }
  var _innerHTML = `<ul class="collection with-header">
<li class="collection-header"><h4>List of settings to validate</h4></li>
`
  for(var v in params.views){
    if(v != _wizard_view_validation_index){
      var _ignore = form_params[params.views[v].name].ignore
      var _backgroundColor = ''
      var _color = ''
      if(v%2===1){
        _backgroundColor = 'background-color: #F1F1F1;'
      }
      if(_ignore !== true){
        _color='color: #454545 !important;'
      }
      _innerHTML = `${_innerHTML}
  <li class="collection-item avatar" style="min-height:20px !important;${_backgroundColor}">
  <i class="material-icons circle ttb-color-${(_ignore===true)?'purple':'green'}" style="${_color}">${(_ignore===true)?'priority_high':'check'}</i>
  <span class="title">${params.views[v].name.toUpperCase()}</span>
  <p>${params.views[v].getResumed()}</p>
  </li>
  `
    }
  }

  _innerHTML = `${_innerHTML}
  </ul>`

  var _needTo = params.views.filter(v => v.isOk() === true && form_params[v.name].ignore !== true).map( v => v.stats.validateAction || 'none').sort( (a, b) => {
    var _correspondance = ['none', 'restart', 'reboot']
    var _a =_correspondance.indexOf(a)
    var _b =_correspondance.indexOf(b)
    if(_a < _b){
        return 1;
    }
    if(_a > _b){
        return -1;
    }
    return 0;
  })

  if(_needTo.length > 0){
    _needTo = _needTo[0]
  } else {
    _needTo = 'none'
  }
  validation_on_validate_needTo = _needTo
  if(_needTo !== 'none'){
    var _needToSentence = ''
    if(_needTo === 'restart'){
      _needToSentence = 'On validation, the device has to restart some application.<br/>The operation can take a minute.'
    } else if(_needTo === 'reboot'){
      _needToSentence = 'On validation, the device has to restart himself.<br/>The operation can take up to five minutes.'
    }
    _needToSentence = `${_needToSentence}<br/><div id="validation_please_wait">Please wait, you will be automatically redirected when your device will be ready.</div>`
    _innerHTML = `${_innerHTML}
        <div class="card ttb-color-light-grey">
          <div class="card-content ttb-color-dark-grey-text">
          ${_needToSentence}
          </div>
        </div>
`
  } else {
    _innerHTML = `${_innerHTML}
        <div id="validation_please_wait" class="card ttb-color-light-grey">
          <div class="card-content ttb-color-dark-grey-text">
            <div>Please wait, you will be automatically redirected when your device will be ready.</div>
          </div>
        </div>
`
  }

  var _validateButton = document.getElementById('wizard_validation_form_validate')
  if(_validateButton){
    if(params.views.filter(v => v.isOk() === false && form_params[v.name].ignore !== true).length === 0){
      _validateButton.classList.remove('disabled')
    } else {
      _validateButton.classList.add('disabled')
    }
  }

  document.getElementById('settings_list_validation').innerHTML = _innerHTML
}
