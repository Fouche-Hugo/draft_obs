var initDone = false;
var settingsDone = false;

function adminData() {
  if (!_S.lolChampSelect.admin)
    _S.lolChampSelect.admin = {}
  
  return _S.lolChampSelect.admin;
}
//#region Socket
function SendMessage(type, content, path){
  var message = {}
  message.Type = type;
  
  if (type == "Update")
    message.Content = JSON.stringify(content);
  else
    message.Content = content;
  
  message.Path = path;
  socket.send(JSON.stringify(message));
}

// Connection opened
socket.addEventListener('open', function (event) {
    SendMessage("Subscribe","lolChampionData")
});

// Listen for messages
socket.addEventListener('message', function (event) {
  var message = JSON.parse(event.data);
  
  console.log(message.Path)

  if (message.Type == "Update"){
    
    StateOnUpdate(message)
    
    if (!initDone && message.Path == "lolChampionData"){
      Main();
    } 
    
    if (!settingsDone && message.Path == "lolChampSelect/admin"){
        settingsDone = true;
    }

  }
});
//#endregion Socket

function Main(){

  SendMessage("Subscribe","lolChampSelect/session")
  SendMessage("Subscribe","lolChampSelect/summoners")
  SendMessage("Subscribe","lolChampSelect/admin")
 
  initDone = true;
}

function teamLogoConverter(){
  return defaultConverter(stringFormatConverter("assets/teams/{0}"))
}

loadBindings();







