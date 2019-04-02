var VIEW_VALIDATION = function() {
  var Validation = function(options) {
    this.type = Validation.type
    this.tab_name = this.type
    this.tab_id = `tab_${this.type}`
    this.navtab_id = `navtab_${this.type}`
    this.main_container_id = `wizard_${this.type}`
    this.index = modules.findIndex(m => m.type === this.type)
    this.params = Object.assign({}, params.views[this.index])
    this.lang = {}
    this.view = ''
    this.form = {}

    this.on_validate_needTo = 'none'
    this.locked = []
  }

  Validation.prototype = new VIEW;

  Validation.prototype.load = function(){
    return new Promise( (resolve, reject) => {
      this.getLang()
      .then( (lang) => {
        this.lang = i18n.create({ values: lang })
        return this.getView()
      })
      .then( (view) => {
        var _html = ejs.render(view, { name: this.type, lang: this.lang })
        if(!_html){
          throw new Error(`cannot render ${this.params.ejs}`)
        } else {
          this.tab_name = this.lang('name')
          document.getElementById(this.navtab_id).innerHTML = this.tab_name
          document.getElementById(this.main_container_id).innerHTML = _html
          var tab = document.getElementById(this.tab_id);
          if(tab){
            tab.addEventListener('click', () => {
              this.reloadView()
            });
          }
          resolve()
        }
      })
      .catch(err => {
        reject(err)
      })
    })
  }

  Validation.prototype.validate = function(){
    var _enable = true
    for(var i in modules){
      if(modules[i].type !== this.type){
        var _ignore = modules[i].instance.form.ignore
        var _isOk = modules[i].instance.isOk()

        if(_isOk === false && _ignore !== true){
          _enable = false
        }
      }
    }

    if(_enable === false){
      return
    }
    this.lock()
    document.getElementById('validation_please_wait').classList.add('is-visible')

    var promises = []
    var promisesIndex = []

    for(var i in modules){
      if(modules[i].type !== this.type){
        if(typeof modules[i].instance.post === 'function' && modules[i].instance.form.ignore !== true){
          promises.push(modules[i].instance.post()
            .then(resp => {
              if(resp === true){
                return { success: true, data: null }
              } else if(resp.message && resp.message.toUpperCase() === 'OK'){
                return { success: true, data: resp }
              }
              return { success: false, data: resp }
            })
            .catch(err => Object.assign({ success: false, data: err })))
          promisesIndex.push(i)
        }
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
          if(isObject(_fail[i].data) && _fail[i].data.hasOwnProperty('key')){
            _msg = modules[_fail[i].index].instance.lang(_fail[i].data.key, _fail[i].data.params || {})
          } else {
            _msg = this.lang('validate_error', { name: modules[_fail[i].index].instance.type})
          }
          M.toast({html: `<b>${this.lang('error')}: ${_msg}</b><button onclick="M.Toast.getInstance(document.querySelector('.toast_e${i}')).dismiss()" style="margin-left: 16px;font-weight:500; margin-right:-14px;" class="btn-flat blue-grey darken-1 white-text">${this.lang('button_ok')}</button>`, displayLength: 500000, classes: `toast_e${i} ttb-color-orange`})
        }
        setTimeout(()=> {
          this.unlock()
        }, 1000)
      } else {
        for(var i in _done){
          if(_done[i].data !== null){
            var _msg = ''
            if(isObject(_done[i].data) && _done[i].data.hasOwnProperty('key')){
              _msg = modules[_done[i].index].instance.lang(_done[i].data.key, _done[i].data.params || {})
            } else {
              _msg = this.lang('validated_success', { name: modules[_done[i].index].instance.type})
            }
            M.toast({html: `<b>${_msg}</b><button onclick="M.Toast.getInstance(document.querySelector('.toast_e${i}')).dismiss()" style="margin-left: 16px;font-weight:500; margin-right:-14px;" class="btn-flat blue-grey darken-1 white-text">${this.lang('button_ok')}</button>`, displayLength: 500000, classes: `toast_e${i} ttb-color-green blue-grey-text text-darken-1`})
          }
        }
        var _needToSentence = ''
        if(this.on_validate_needTo === 'none'){
          _needToSentence = ''
        } else if(this.on_validate_needTo === 'restart'){
          _needToSentence = this.lang('validate_restart')
        } else {
          _needToSentence = this.lang('validate_reboot')
        }
        M.toast({html: `<b>${this.lang('validate_done')}<br>${_needToSentence}${this.lang('validate_redirect')}</b>`, displayLength: 500000, classes: `ttb-color-green blue-grey-text text-darken-1`})
        if(this.on_validate_needTo === 'none'){
          setTimeout( () => {
            window.location = '/'
          }, 3000)
        } else if(this.on_validate_needTo === 'restart'){
          WIZARD.restartDevice()
        } else if(this.on_validate_needTo === 'reboot'){
          WIZARD.restartDevice(true)
        }
      }
    });
  }

  Validation.prototype.reloadView = function(){
    if(this.locked.length > 0) {
      return
    }
    var _innerHTML = `
      <ul class="collection with-header">
        <li class="collection-header"><h4>${this.lang('list_title')}</h4></li>
    `
    var _needTo = []
    var _enable = true
    for(var i in modules){
      if(modules[i].type !== this.type){
        var _ignore = modules[i].instance.form.ignore
        var _isOk = modules[i].instance.isOk()
        var _backgroundColor = ''
        var _color = ''
        if(i%2===1){
          _backgroundColor = 'background-color: #F1F1F1;'
        }
        if(_ignore !== true){
          _color = 'color: #454545 !important;'
        }
        _innerHTML = `${_innerHTML}
          <li class="collection-item avatar" style="min-height:20px !important;${_backgroundColor}">
            <i class="material-icons circle ttb-color-${(_ignore===true)?'purple':'green'}" style="${_color}">${(_ignore===true)?'priority_high':'check'}</i>
            <span class="title">${modules[i].instance.tab_name}</span>
            <p>${modules[i].instance.getResumed()}</p>
          </li>
        `
        if(_isOk === true && _ignore !== true){
          _needTo.push(modules[i].instance.params.stats.validateAction || 'none')
        }

        if(_isOk === false && _ignore !== true){
          _enable = false
        }
      }
    }

    _innerHTML = `${_innerHTML}
      </ul>
    `

    _needTo = _needTo.sort((a, b) => {
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
    this.on_validate_needTo = _needTo

    if(_needTo !== 'none'){
      var _needToSentence = ''
      if(_needTo === 'restart'){
        _needToSentence = this.lang('tips_restart')
      } else if(_needTo === 'reboot'){
        _needToSentence = this.lang('tips_reboot')
      }
      _needToSentence = `${_needToSentence}<br/><div id="validation_please_wait">${this.lang('tips_please_wait')}</div>`

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
            <div>${this.lang('tips_please_wait')}</div>
          </div>
        </div>
      `
    }

    var _validateButton = document.getElementById('wizard_validation_form_validate')
    if(_validateButton){
      if(_enable === true){
        _validateButton.classList.remove('disabled')
      } else {
        _validateButton.classList.add('disabled')
      }
    }

    var settings_list_validation = document.getElementById('settings_list_validation')
    if(settings_list_validation){
      settings_list_validation.innerHTML = _innerHTML
    }
  }

  Validation.prototype.lock = function(){
    document.getElementById('wizard_validation_form_validate').classList.add('disabled')
    for(var i in modules){
      if(modules[i].instance.disableView()){
        this.locked.push(i)
      }
    }
  }

  Validation.prototype.unlock = function(){
    for(var i in this.locked){
      VIEW.enableView(this.locked[i])
    }
    this.locked = []
    document.getElementById('wizard_validation_form_validate').classList.remove('disabled')
    this.reloadView()
  }

  Validation.type = 'validation'

  return Validation
}()

modules.push({type: VIEW_VALIDATION.type, module: VIEW_VALIDATION})
