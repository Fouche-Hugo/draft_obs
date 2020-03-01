const socket = new WebSocket('ws://localhost:9346');

var _S = {}
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
  
  if (message.Type == "Update"){
    
    var splits = message.Path.split("/")
    var current = _S;
    var _new = JSON.parse(message.Content)
    
    for (var i = 0; i < splits.length-1; i++){
      var leg = splits[i]
      if (!current[leg])
        current[leg] = {}
      
      current = current[leg]
    }
    
    current[splits[splits.length-1]] = _new;
    
    if (!initDone && message.Path == "lolChampionData"){
      Main();
    } 
    
    if (!settingsDone && message.Path == "lolChampSelect/admin"){
        settingsDone = true;
        LoadTeam("left")
        LoadTeam("right")
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

function InitTeam(side){
  var teamColor = document.querySelector(".team-"+side+"-color")
  var teamIconFn = document.querySelector(".team-"+side+"-icon-fn")
  var teamImage = document.querySelector(".team-"+side+"-img")
  var teamScore = document.querySelector(".team-"+side+"-score")
  var teamName = document.querySelector(".team-"+side+"-name")

  teamColor.innerHTML = getComputedStyle(document.documentElement).getPropertyValue("--team-"+side+"-color");
  teamIconFn.innerHTML = adminData()[side+"TeamIcon"]
  teamScore.innerHTML = adminData()[side+"TeamScore"]
  teamName.innerHTML = adminData()[side+"TeamName"]

}

function LoadTeam(side){
  var teamColor = document.querySelector(".team-"+side+"-color")
  var teamIconFn = document.querySelector(".team-"+side+"-icon-fn")
  var teamImage = document.querySelector(".team-"+side+"-img")
  var teamScore = document.querySelector(".team-"+side+"-score")
  var teamName = document.querySelector(".team-"+side+"-name")
  
  teamColor.addEventListener('input', function() {
      adminData()[side+"TeamColor"] = teamColor.innerHTML
      document.documentElement.style.setProperty("--team-"+side+"-color", adminData()[side+"TeamColor"]);
      SendMessage("Update",adminData(), "lolChampSelect/admin")
  });

  teamIconFn.addEventListener('input', function() {
      adminData()[side+"TeamIcon"] = teamIconFn.innerHTML
      teamImage.src = "assets/teams/"+adminData()[side+"TeamIcon"]
      SendMessage("Update",adminData(), "lolChampSelect/admin")
  });

  teamScore.addEventListener('input', function() {
      adminData()[side+"TeamScore"] = teamScore.innerHTML
      SendMessage("Update",adminData(), "lolChampSelect/admin")
  });

  teamName.addEventListener('input', function() {
      adminData()[side+"TeamName"] = teamName.innerHTML
      SendMessage("Update",adminData(), "lolChampSelect/admin")
  });
}

LoadTeam("left")
LoadTeam("right")





