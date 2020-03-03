const socket = new WebSocket('ws://localhost:9346');

var Layouts = ["five-medium","five-big", "three-small-two-big", "three-big-two-small", "small-picks","truncated-picks", "three-big","during-initial","after-initial"]
var Locations = ["top", "bottom"]
var States = ["gone"]

var lolv = "10.4.1"

var _S = {}
var champData = () => _S.lolChampionData

_S.picks = {1: [], 2: []}
_S.bans = {1: [], 2: []}

var initDone = false;

var age = 0;

var phaseTimer = 0;

setInterval(function() {
  phaseTimer--
  
  if (phaseTimer < 0)
    phaseTimer = 0;
  
  SetTimerText(phaseTimer)
},1000);

function Log(...arr){
  console.log(arr)
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

var bindings = {}

function defaultValueConverter(binding, value){
  binding.object[binding.attribute] = value
  return binding.object[binding.attribute]
}

function BindElementAttribute(object, attributeName, statePath, setter){
  if (bindings[statePath] == null)
    bindings[statePath] = []
  
  if (setter == null)
    setter = defaultValueConverter;
  
  var newBinding = {"object" : object, "attribute": attributeName, "path": statePath, "setter" : setter };
  
  newBinding.setValue = function(value){
    setter(newBinding, value)
  }
  
  bindings[statePath].push(newBinding)
}

function UpdateAdmin(){
  var adminData =  _S.lolChampSelect.admin;

  /*document.querySelector(".teaminfo-left .logo img").src = "assets/teams/"+adminData.leftTeamIcon;
  document.querySelector(".teaminfo-left .name p").innerHTML = adminData.leftTeamName;
  document.querySelector(".teaminfo-left .score p").innerHTML = adminData.leftTeamScore;
  document.documentElement.style.setProperty("--team-left-color", adminData.leftTeamColor);
  
  
  document.querySelector(".teaminfo-right .logo img").src = "assets/teams/"+adminData.rightTeamIcon;
  document.querySelector(".teaminfo-right .name p").innerHTML = adminData.rightTeamName;
  document.querySelector(".teaminfo-right .score p").innerHTML = adminData.rightTeamScore;
  document.documentElement.style.setProperty("--team-right-color", adminData.rightTeamColor);*/
}

function ResolvePath(_path){

  var splits = _path.split("/")
  
  var current = _S;
    
  for (var i = 0; i < splits.length-1; i++){
    var leg = splits[i]
    if (current[leg] == null){
      current[leg] = {}
    }
    current = current[leg]
  }
  
  return {"object": current, "attribute": splits[splits.length-1], "value": current[splits[splits.length-1]]};
}

// Listen for messages
socket.addEventListener('message', function (event) {
  var message = JSON.parse(event.data);
  
  if (message.Type == "Update"){
    
    var _new = JSON.parse(message.Content)
        
    var current = ResolvePath(message.Path)
    
    var splits = message.Path.split("/")
    
    current.object[current.attribute] = _new;
    
    for(var path in bindings){
      for (var i = 0; i < bindings[path].length; i++){
        var binding = bindings[path][i]
        if (binding.path.includes(message.Path)){
          var bound = ResolvePath(binding.path)
          //console.log(binding.object, binding.attribute, binding.object[binding.attribute])
          //console.log(bound.object, bound.attribute, bound.value)
          if (bound != null)
            binding.setValue(bound.value)
          else
            binding.setValue("")
        }
      }
    }
    
    if (!initDone && message.Path == "lolChampionData"){
      Main();
    } else if (message.Path == "lolChampSelect/session") {
      UpdatePB();
    } else if (message.Path == "lolChampSelect/admin"){
      UpdateAdmin()
    }

  }
});
//#endregion Socket


function LookupCellId(cellId){
  return function(el) { return el.cellId == action.actorCellId};
}



function GetPlayerByCellId(cellId){
  var cs = _S.lolChampSelect.session;
  
  var lookup = cs.myTeam.find(function(el) { return el.cellId == cellId})
  
  if (!lookup)
    lookup = cs.theirTeam.find(function(el) { return el.cellId == cellId})
  
  return lookup;
}



function SetTimerText(seconds){
  var timer = document.getElementsByClassName("countdown")[0]
  timer.innerHTML = seconds
}


function SetPhaseText(phase){
  var phaseText = document.getElementsByClassName("phase-title")[0]
  phaseText.innerHTML = phase
}

function GetLastInProgressAction(){
  var actions = _S.lolChampSelect.session.actions
  for (var i = actions.length-1; i >= 0; i--){
    for(var k = 0; k < actions[i].length; k++){  
      var action = actions[i][k];
      if (action.isInProgress)
        return action;
    }
  }
  return null;
}

var lastPhase = ""

function DeterminePhase(timerPhase, actions){
  
  switch (timerPhase){
    case "BAN_PICK":
   
      var inProgress = GetLastInProgressAction()
      
      if (!inProgress)
        return lastPhase;
      
      return inProgress.type == "ban" ? "Ban Phase" : "Pick Phase"
    case "FINALIZATION":
      return  "Final Phase";
    case "GAME_STARTING":
      return  "Game Starting"
    case "PLANNING":
      return  "Planning"
    default:
      return  "Waiting";
  }
}

function UpdatePhase(newPhase){
  if (lastPhase == newPhase)
    return false;
  
  lastPhase = newPhase
  console.log(newPhase)
  switch(newPhase){
    case "Pick Phase":
      setTimeout(function() {
        SetLayout("soloqueue","picks")
      }, 1500);    
      break;
    case "Ban Phase":
      setTimeout(function() {
        SetLayout("soloqueue","bans")
      }, 1500);      
      break;
    case "Planning":
      SetLayout("header")
      break;
    case "Waiting":
      SetLayout("reset")
      ResetPicksAndBans();
      break;
    default:
  }
  
  SetPhaseText(newPhase)
}

function UpdateTimer(timer){
  if (timer && timer.timeLeftInPhaseInSec)
    phaseTimer = timer.timeLeftInPhaseInSec
}

function UpdateDisplaySlot(team, slot, collection, action){

  var i = 1;
  var dc = collection[team][slot].dataContext;
  //Magic to automatically map captains mode
  while (action != null && (dc.redefined || dc.completed && !action.completed)){
    dc.redefined = true
    dc = collection[team][slot+i].dataContext;
    i++;
  }
  
  return dc.update(action);
}

function ResetPicksAndBans(){
  for (var i = 0; i < 5; i++){
    _S.picks[1][i].dataContext.update(null)
    _S.picks[2][i].dataContext.update(null)
    _S.bans[1][i].dataContext.update(null)
    _S.bans[2][i].dataContext.update(null)
  }
}

function UpdatePB(){
  
  age++;
  age = age%500;
  
  var cs = _S.lolChampSelect.session;
  var actions = cs.actions;
  var myTeam = cs.myTeam
  var theirTeam = cs.theirTeam
  
  //BAN_PICK, FINALIZATION, GAME_STARTING, "", PLANNING

  UpdateTimer(cs.timer)
  UpdatePhase(DeterminePhase(cs.timer ? cs.timer.phase : "", actions))
  
  for (var i = actions.length-1; i >= 0; i--){
    //console.log(actions[i])
    for(var k = 0; k < actions[i].length; k++){  
      var action = actions[i][k];

      var lookup = GetPlayerByCellId(action.actorCellId)
      
      if (lookup){
        var myTeamTeam = myTeam[0].team
        var placementTeam = myTeamTeam == lookup.team ? 1 : 2
        var collection = action.type == "ban" ? _S.bans : _S.picks
        UpdateDisplaySlot(placementTeam, lookup.cellId % 5, collection,action);

      }
    }
  } 
  
}

//#region DataContext
function GenerateSplashArtUrl(championId){
  return "/assets/cdragon/champion/"+championId+"/splash-art/centered";
}

function GenerateSquareArtUrl(championId){
  return "/assets/cdragon/champion/"+championId+"/square.png"
}

function GetPickContainer(team){
  return document.getElementsByClassName((team == 1 ? "left" : "right")+" picks")[0]
}

function GetBanContainer(team){
  return document.getElementsByClassName((team == 1 ? "left" : "right")+" bans")[0]
}

function CreateDiv(classname, innerHTML){
  var el = document.createElement("div");
  el.dataContext = {}
  el.className = classname;
  el.innerHTML = innerHTML;
  return el;
}

function ValueChanged(context, data, prop){
  //console.log(context[prop], data == null ? null : data[prop], prop)
  
  if (data == null || data[prop] == null)
    delete context[prop]
  else
    context[prop] = data[prop]
  
  if (prop == "completed" && context.type == "ban" && context[prop] && !data[prop]){
  }
}

function UpdateDataContext(context, data){
  
  var difference = false;
  
  if (context.age != age){
    
    if (!context.dcProperties)
      context.dcProperties = {}
    
    for(var prop in context.dcProperties){
      if (data == null || data[prop] == null){
        difference = true;
        ValueChanged(context, data, prop)
        delete context.dcProperties[prop]
      }
    }
    
    for(var prop in data){
      context.dcProperties[prop] = 1
      if (context[prop] != data[prop]){
        difference = true;
        ValueChanged(context, data, prop)
      }
    }
    
    context.age = age;
  }
  
  return difference;
}

function GetSummonerName(summonerId, cellId){
  var summonerMap = _S.lolChampSelect.summoners;
  
  if (summonerMap == null)
    return "N/A"
  
  if (summonerId == 0 || !summonerMap[summonerId])
    return "Summoner "+(cellId+1);
  
  return summonerMap[summonerId].displayName
}

function PickOnUpdate(el, data){
  
  var display = el.querySelector(".display")
  var pickTextElement = el.querySelector(".pick-text")
  var playerName = el.querySelector(".pick-player")
  var champName = el.querySelector(".pick-champ")
  var roleIcon = el.querySelector(".pos-icon")
  
  if (data == null){
    //console.log("Resetting pic")
    playerName.innerHTML = ""
    champName.innerHTML = ""
    roleIcon.style.backgroundImage = null
    ReplaceStyles(el, "", Layouts)
    display.style.backgroundColor = null;
    display.style.backgroundImage = null;
    display.style.opacity = null;
  } else {

    var player = GetPlayerByCellId(data.actorCellId)
    
    var champ = champData().byId[data.championId]
    
    playerName.innerHTML = GetSummonerName(player.summonerId, data.actorCellId)
    champName.innerHTML = champ ? champ.name : "picking..."
    
    roleIcon.style.backgroundImage = "url( "+"assets/roles/role-"+(player.assignedPosition == "" ?  "fill" : player.assignedPosition)+".png"+" )"
    
    if (!champ){
      if (data.isInProgress){
        ReplaceStyles(el, "during-initial", Layouts)
        display.style.backgroundImage = null;
        
        display.style.opacity = 0.8
        
        if (player.team == 1)
          display.style.backgroundColor = "var(--team-left-color)"
        else 
          display.style.backgroundColor = "var(--team-right-color)"
      }

    } else{
      ReplaceStyles(el, "after-initial", Layouts)
      
      var region = champData().splash.horizontal[champ.id];
      var url = GenerateSplashArtUrl(champ.id)
      
      display.style.backgroundImage = "url( "+url+" )"
      display.style.backgroundPositionX = region.backgroundPositionX;
      display.style.backgroundPositionY = region.backgroundPositionY;
      display.style.transform = region.transform;
      
      if (!el.dataContext.completed)
        display.style.opacity = 0.8;
      else
        display.style.opacity = 1.0;
    }
  }
}

function CreatePick(_parent){
  var el = CreateDiv("pick","<div class='pick-text'><div class='pos-icon'></div><p class='pick-champ'/><p class='pick-player'/></div><div class='display'></div>")
  _parent.appendChild(el)
  el.dataContext.update = function(data){
    if (UpdateDataContext(el.dataContext, data) || data == null){
      PickOnUpdate(el, data)
    }
  }  
  return el;
}

function CreateBan(_parent){
  var el = CreateDiv("ban","")
  _parent.appendChild(el)
  el.dataContext.update = function(data){
    if (UpdateDataContext(el.dataContext, data) || data == null){
     
     if (data == null){
       el.style.backgroundColor = null;
       el.style.backgroundImage = null;
     } else {
     
        var champ = _S.lolChampionData.byId[data.championId]
         
        var player = GetPlayerByCellId(data.actorCellId) 
         
        if (!champ){
          if (player.team == 1)
            el.style.backgroundColor = "var(--team-one-color)"
          else 
            el.style.backgroundColor = "var(--team-two-color)"        
          
        } else{
          var url = GenerateSquareArtUrl(champ.id)
          
          el.style.backgroundImage = "url( "+url+" )"
          if (!el.dataContext.completed)
            el.style.opacity = 0.6;
          else
            el.style.opacity = 1.0;
        }
      }
    }
  }
  return el;
}

//#endregion DataContext


//#region Dom Manipulation
function ReplaceStyles(elem, style,styles){
  var ret = false;
  for (var k = 0; k < styles.length; k++){
    var cl = styles[k];
    if (style != cl){
      elem.classList.remove(cl);
      ret = true;
    }
  }
  
  if (style != "")
    elem.classList.add(style);
  
  return ret;
}

function SetElementLayout(elem, layout, locat, state, time){
  setTimeout(function() {ReplaceStyles(elem, state, States)}, time ? time : 1);
  setTimeout(function() {ReplaceStyles(elem, locat, Locations)}, time ? time : 1);
  setTimeout(function() {ReplaceStyles(elem, layout, Layouts)}, time ? time : 1);
  
}

function SetClassLayout(elementClass, layout, locat, state, time){
  var eles = document.getElementsByClassName(elementClass);

  for (var i = 0; i < eles.length; i++){
    SetElementLayout(eles[i], layout, locat, state, time)
  } 
}


function SetLayout(type, phase){
  
  if (type == "header")
    SetClassLayout("header","", "", "")
  

  if (type == "soloqueue"){
    if (phase == "bans"){
      SetClassLayout("header","", "", "")
      SetClassLayout("picks","small-picks","bottom", "", 500);
      SetClassLayout("bans","five-big", "top", "gone");
      SetClassLayout("bans","five-big", "top", "", 500);
    } 
    if (phase == "picks"){
      SetClassLayout("header","", "", "")
      SetClassLayout("bans","five-big", "top", "gone")
      SetClassLayout("bans","five-medium", "bottom", "gone", 500)
      SetClassLayout("bans","five-medium", "bottom", "", 1200)
      SetClassLayout("picks", "", "", "", 500)
    }
  }
  
  if (type == "pro"){
    if (phase == "p1"){
      SetClassLayout("bans","three-big", "top", "gone")
      SetClassLayout("bans","three-big", "top", "", 500)
      SetClassLayout("picks","","", "gone");
    }
    if (phase == "p2"){
      SetClassLayout("bans","three-big", "bottom", "")
      SetClassLayout("picks", "truncated-picks", "", "", 500)
    }
    if (phase == "p3"){
      SetClassLayout("bans","three-small-two-big", "bottom", "")
    }
    if (phase == "p4"){
      SetClassLayout("bans","five-medium", "bottom", "")
      SetClassLayout("picks", "", "", "")
    }    
  }
  
  if (type == "reset"){
    SetClassLayout("picks","three-big", "top", "gone")
    SetClassLayout("bans","", "", "gone")
    SetClassLayout("header","", "", "gone")
    
  }
  
}

//#endregio Dom Manipulation

function preloadImage(CreationFunc, id){
  var splashPreloader = new Image();
  var preloader = document.getElementById("preloader");
  id++;
  preloader.appendChild(splashPreloader);
  var onload = function(ev){
    preloadImage(CreationFunc, id)
  }
 
  if (id < champData().byIndex.length){
    splashPreloader.addEventListener('load', onload)
    splashPreloader.src = CreationFunc(champData().byIndex[id].id)
    
  };
}

function UpdateChampionData(){
  fetch("http://ddragon.leagueoflegends.com/cdn/"+lolv+"/data/en_US/champion.json")
  .then(res => res.json())
  .then((out) => {
    var championMap = champData().byKey;
    var championsByIndex = champData().byIndex;
    var championsById = champData().byId;
    
    championMap = out.data;
    for (var k in championMap){
      championsById[championMap[k].key] = championMap[k]
      championsByIndex.push(championMap[k])
    }
    SendMessage("Update",championsById, "lolChampionData/byId")
    SendMessage("Update",championMap, "lolChampionData/byKey")
    SendMessage("Update",championsByIndex, "lolChampionData/byIndex")
  })
}

function Main(){
  for (var i = 0; i < 5; i++){
    _S.picks[1].push(CreatePick(GetPickContainer(1)))
    _S.picks[2].push(CreatePick(GetPickContainer(2)))
    _S.bans[1].push(CreateBan(GetBanContainer(1)))
    _S.bans[2].push(CreateBan(GetBanContainer(2)))
  }
  
  preloadImage(GenerateSplashArtUrl, 0);
  preloadImage(GenerateSquareArtUrl, 0);

  BindElementAttribute(document.querySelector(".teaminfo-left .logo img"), "src", "lolChampSelect/admin/leftTeamIcon", (binding, value) => binding.object[binding.attribute] = "assets/teams/"+value )
  BindElementAttribute(document.querySelector(".teaminfo-left .name p"), "innerHTML", "lolChampSelect/admin/leftTeamName" )
  BindElementAttribute(document.querySelector(".teaminfo-left .score p"), "innerHTML", "lolChampSelect/admin/leftTeamScore" )
  BindElementAttribute(document.documentElement.style, "--team-left-color", "lolChampSelect/admin/leftTeamColor", (binding, value) => binding.object.setProperty(binding.attribute, value))
 
  BindElementAttribute(document.querySelector(".teaminfo-right .logo img"), "src", "lolChampSelect/admin/rightTeamIcon", (binding, value) => binding.object[binding.attribute] = "assets/teams/"+value )
  BindElementAttribute(document.querySelector(".teaminfo-right .name p"), "innerHTML", "lolChampSelect/admin/rightTeamName" )
  BindElementAttribute(document.querySelector(".teaminfo-right .score p"), "innerHTML", "lolChampSelect/admin/rightTeamScore" )
  BindElementAttribute(document.documentElement.style, "--team-right-color", "lolChampSelect/admin/rightTeamColor", (binding, value) => binding.object.setProperty(binding.attribute, value))
 
  SendMessage("Subscribe","lolChampSelect/session")
  SendMessage("Subscribe","lolChampSelect/summoners")
  SendMessage("Subscribe","lolChampSelect/admin")
  initDone = true;
}



/*fetch("assets/pickregion.json")
.then(res => res.json())
.then((out) => {
  pickRegions = out;
  for (var k in pickRegions){
    var r = pickRegions[k];
  }
  SendMessage("Update",pickRegions, "lolChampionData/splash/horizontal")
  /*setTimeout(function(){SetPick(1, 3, "Zyra")}, 2000);
  setTimeout(function(){SetPick(1, 3, "Ahri")}, 4000);
  setTimeout(function(){SetPick(1, 3, "Senna")}, 6000);
  setTimeout(function(){SetPick(1, 3, "Sett")}, 8000);*/
//})

/*const el = document.querySelector(".pick .display");
const inv = document.querySelector(".invert")
const save = document.querySelector(".save")

var on = false;
var ccount = 1
var cid = 0
var lnk = ""

inv.addEventListener("click", (e) => {
  if (el.style.transform == "scaleX(-1)")
    el.style.transform = "";
  else
    el.style.transform = "scaleX(-1)"
});

save.addEventListener("click", (e) => {
  if (ccount > 1){
    pickRegions[championsByIndex[ccount-1].id] = {backgroundPositionX: el.style.backgroundPositionX, backgroundPositionY: el.style.backgroundPositionY, transform: el.style.transform}
  }
  
  while (pickRegions[championsByIndex[ccount].id])
    ccount++;
  
  cid = championsByIndex[ccount]
  lnk = "url( https://cdn.communitydragon.org/latest/champion/"+cid.id+"/splash-art/centered )"
  el.style.backgroundImage = lnk
  ccount++;  
});

el.addEventListener("mousedown", (e) => {
  on = true;
});

el.addEventListener("mouseup", (e) => {
  on = false;
});

el.addEventListener("click", (e) => {
  
});

el.addEventListener("mouseleave", (e) => {
  on = false;
});


el.addEventListener("mousemove", (e) => {
  if (on){
    el.style.backgroundPositionX = -e.offsetX + "px";
    el.style.backgroundPositionY = -e.offsetY + "px";
  }
});*/


