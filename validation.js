_wizard_view_validation_index = params.views.findIndex(v => v.name === 'validation')

ejs.renderFile(
  params.views[_wizard_view_validation_index].ejs,
  Object.assign({
    viewIndex: _wizard_view_validation_index
  }, params),
  { async: false },
  (_err, _str) => {
    document.getElementById('wizard_validation').innerHTML = _str

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
        console.log('done', _done)
        console.log('fail', _fail)
      });

      setTimeout(()=> {
        validationUnlockAction()
      }, 5000)
    }

    var view_li = document.getElementsByClassName(`tab_${params.views[_wizard_view_validation_index].order}`);
    if(view_li.length > 0){
      view_li[0].addEventListener('click', function(){
        validation_reload_view()
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

      var _needTo = params.views.map( v => v.stats.validateAction || 'none').sort( (a, b) => {
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
            <div class="card blue-grey darken-1">
              <div class="card-content white-text">
              ${_needToSentence}
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
  }
)
