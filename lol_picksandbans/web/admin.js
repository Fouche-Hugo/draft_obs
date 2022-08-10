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
        
        fetch("https://ddragon.leagueoflegends.com/api/versions.json")
            .then(res => res.json())
            .then((out) => {
                var lastSix = out.slice(0, 6)
                var versionSelector = document.getElementsByClassName("version-select")[0];
                for (const version of lastSix) {
                    var opt = document.createElement('option');
                    opt.value = version;
                    opt.innerHTML = version;
                    versionSelector.appendChild(opt);
                }

                if (adminData().version == undefined) {
                    adminData().version = lastSix[0]                   
                }
                
                versionSelector.value = adminData().version;
            })

        var el = document.getElementsByClassName("pick")[0];

        var enableMove = false
        el.style = 'background-image: url("/assets/cdragon/img/champion/centered/Ahri_0.jpg");';
        el.style.backgroundPositionX = 0
        el.style.backgroundPositionY = 0

        var xstart = 0
        var ystart = 0
        var xback = 0
        var yback = 0

        el.addEventListener("mousedown", (e) => {
            xstart = e.clientX;
            ystart = e.clientY;
            xback = parseInt(el.style.backgroundPositionX, 10);
            yback = parseInt(el.style.backgroundPositionY, 10);
       
            enableMove = true;
        });

        el.addEventListener("mousemove", (e) => {
            if (!enableMove)
                return;

            var xdiff = e.clientX - xstart;
            var ydiff = e.clientY - ystart;

            console.log((xback + xdiff), (yback + ydiff))

            el.style.backgroundPositionX = (xback+xdiff) + "px";
            el.style.backgroundPositionY = (yback+ydiff) + "px";
        });
        el.addEventListener("mouseout", (e) => {
            enableMove = false;
        });

        el.addEventListener("mouseup", (e) => {
            enableMove = false;
        });
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







