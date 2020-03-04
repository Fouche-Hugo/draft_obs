const socket = new WebSocket('ws://localhost:9346');

var Layouts = ["five-medium","five-big", "three-small-two-big", "three-big-two-small", "small-picks","truncated-picks", "three-big","during-initial","after-initial"]
var Locations = ["top", "bottom"]
var States = ["gone"]

var lolv = "10.4.1"

var _S = {}
var champData = () => _S.lolChampionData

_S.picks = {1: [], 2: []}
_S.bans = {1: [], 2: []}
_S.pickElements = {1: [], 2: []}
_S.banElements = {1: [], 2: []}

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
  binding.dataContext[binding.attribute] = value
  return binding.dataContext[binding.attribute]
}

function BindSetter(dataContext, attributeName, statePath, setter){
  if (bindings[statePath] == null)
    bindings[statePath] = []
  
  if (setter == null)
    setter = defaultValueConverter;
  
  var newBinding = {"dataContext" : dataContext, "attribute": attributeName, "path": statePath, "setter" : setter };
  
  newBinding.setValue = function(value){
    setter(newBinding, value)
  }
  
  bindings[statePath].push(newBinding)
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

function UpdatePath(path, object){
  var current = ResolvePath(path)
  
  current.object[current.attribute] = object;
  
  for(var boundPath in bindings){
    for (var i = 0; i < bindings[boundPath].length; i++){
      var binding = bindings[boundPath][i]
      if (binding.path.includes(boundPath)){
        
        var bound = ResolvePath(binding.path)
        
        if (bound != null)
          binding.setValue(bound.value)
        else
          binding.setValue("")
      }
    }
  }
}

// Listen for messages
socket.addEventListener('message', function (event) {
  var message = JSON.parse(event.data);
  
  if (message.Type == "Update"){
    
    UpdatePath(message.Path, JSON.parse(message.Content))
    
    if (!initDone && message.Path == "lolChampionData"){
      Main();
    } else if (message.Path == "lolChampSelect/session") {
      UpdatePB();
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

function UpdateSlot(slot, action, player){
  var changedProperties = []
  
  var summonerName = GetSummonerName(player.summonerId, player.cellId)
  var champName = action.championId > 0 ? champData().byId[action.championId].name : ""
  var image = action.championId > 0 ? champData().byId[action.championId].id : ""
  
  if (slot.summonerName != summonerName)
    changedProperties.push("summonerName");
  
  if (slot.championName != champName)
    changedProperties.push("championName");
  
  if (slot.active != action.isInProgress)
    changedProperties.push("active");
  
  if (slot.finished != action.completed)
    changedProperties.push("finished");
  
  if (slot.team != player.team)
    changedProperties.push("team");

  if (slot.image != image)
    changedProperties.push("image");
  
  slot.summonerName = summonerName
  slot.championName = champName
  slot.active = action.isInProgress
  slot.finished = action.completed
  slot.team = player.team
  slot.image = image
  
  return changedProperties;

}

function UpdatePB(){
  age++;
  age = age%500;
  
  var cs = _S.lolChampSelect.session;
  var actions = cs.actions;
  var myTeam = cs.myTeam
  var theirTeam = cs.theirTeam
  
  UpdateTimer(cs.timer)
  UpdatePhase(DeterminePhase(cs.timer ? cs.timer.phase : "", actions))
  
  var processedCells = []
 
  for (var i = actions.length-1; i >= 0; i--){
    for(var k = 0; k < actions[i].length; k++){  
      var action = actions[i][k];
      
      var trueCellId = action.type+action.actorCellId
      
      if (processedCells.includes(trueCellId))
        continue;
      
      processedCells.push(trueCellId)
      
      var player = GetPlayerByCellId(action.actorCellId)
      
      if (!player)
        continue;
      
      var collection = action.type == "ban" ? _S.bans : _S.picks
      var placementTeam = myTeam[0].team == player.team ? 1 : 2    
      var slot = collection[placementTeam][player.cellId % 5]
      
      var changedProperties = UpdateSlot(slot, action, player)
      
      for(var p = 0; p < changedProperties.length; p++){
        UpdatePath("lolChampSelect/"+action.type+"/"+placementTeam+"/"+(action.actorCellId % 5)+"/"+changedProperties[p], slot[changedProperties[p]])
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

function GetSummonerName(summonerId, cellId){
  var summonerMap = _S.lolChampSelect.summoners;
  
  if (summonerMap == null)
    return "N/A"
  
  if (summonerId == 0 || !summonerMap[summonerId])
    return "Summoner "+(cellId+1);
  
  return summonerMap[summonerId].displayName
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

function StringFormatConverter(formatString){
  return (binding,value) => {
    return formatString.replace("{0}", value)
  }
}

function SummonerNameConverter(){
  return (binding,value) => {
    if (value != null)
      return GetSummonerName(value, binding.dataContext.player.cellId)
  }
}

function ElementAttributeSetter(converter){
  return (binding, value) => {
    binding.dataContext[binding.attribute] = (converter ? converter(binding,value) : value)
  }
}

function CssVariableSetter(){
  return (binding, value) => binding.dataContext.setProperty(binding.attribute, value)
}

function CssVariableAttributeSetter(){
  return (binding, value) => { binding.dataContext[binding.attribute] = "var("+value+")" }
}

function ConditionalSetter(originalSetter, newValue){
  return (binding, value) => { return value ? originalSetter(binding,newValue) : null }
}

function BindPick(team, slot){
  
  var elem = _S.pickElements[team][slot];
  var slotPath = "lolChampSelect/pick/"+team+"/"+slot+"/"
  BindSetter(elem.querySelector(".pick-player"), "innerHTML", slotPath+"summonerName", ElementAttributeSetter)
  BindSetter(elem.querySelector(".pick-champ"), "innerHTML",  slotPath+"championName", ElementAttributeSetter)
  BindSetter(elem.querySelector(".display").style, "backgroundColor", slotPath+"team", (binding, value) => {
    if (value == null)
       binding.dataContext[binding.attribute] = null;
    if (value == 1)
      binding.dataContext[binding.attribute] = "var(--team-left-color)"
    if (value == 2)
      binding.dataContext[binding.attribute] = "var(--team-right-color)"
  });
  BindSetter(elem.querySelector(".pick-champ"), "src",  slotPath+"championName", ElementAttributeSetter)
  
  /*BindSetter(elem, "sessionAction", "lolChampSelect/pick/"+team+"/"+slot+"", ElementAttributeSetter())
  BindSetter(elem.querySelector(".pick-player"), "player", "lolChampSelect/pick/"+team+"/"+slot+"/player", ElementAttributeSetter())
  BindSetter(elem.querySelector(".pick-player"), "innerHTML", "lolChampSelect/pick/"+team+"/"+slot+"/player/summonerId", ElementAttributeSetter(SummonerNameConverter()))
  BindSetter(elem.querySelector(".display").style, "backgroundColor", "lolChampSelect/pick/"+team+"/"+slot+"/player/team", (binding, value) => {
    if (value == null)
       binding.dataContext[binding.attribute] = null;
    if (value == 1)
      binding.dataContext[binding.attribute] = "var(--team-left-color)"
    if (value == 2)
      binding.dataContext[binding.attribute] = "var(--team-right-color)"
  })
 
  BindSetter(elem, "*", "lolChampSelect/pick/"+team+"/"+slot+"/championId", (binding, value) => {
    var el = binding.dataContext;
    var action = el.sessionAction;
    var display = el.querySelector(".display")
    var champName = el.querySelector(".pick-champ")
    
    if (value == null){
      ReplaceStyles(el, "", Layouts)
      champName.innerHTML = ""
    }
    else if (value != 0 ) {
      var champ = champData().byId[value]
      
      ReplaceStyles(el, "after-initial", Layouts)

      var region = champData().splash.horizontal[champ.id];
      var url = GenerateSplashArtUrl(champ.id)
      
      display.style.backgroundImage = "url( "+url+" )"
      console.log(region, url, champ)
      display.style.backgroundPositionX = region.backgroundPositionX;
      display.style.backgroundPositionY = region.backgroundPositionY;
      display.style.transform = region.transform;      

      champName.innerHTML = champ.name
    } else if ( action.isInProgress ){
      ReplaceStyles(el, "during-initial", Layouts)
      display.style.backgroundImage = null;
      champName.innerHTML = "picking..."
    }    
    
  });
 
  BindSetter(elem.querySelector(".display").style, "opacity", "lolChampSelect/pick/"+team+"/"+slot+"/completed", (binding, value) => {
    if (!value) 
      binding.dataContext[binding.attribute] = 0.8
    else 
      binding.dataContext[binding.attribute] = 1.0
  })*/
}

function BindBan(team, slot){
  /*var elem = _S.bans[team][slot];
  
  BindSetter(elem, "sessionAction", "lolChampSelect/ban/"+team+"/"+slot+"", ElementAttributeSetter())
  
  BindSetter(elem.style, "opacity", "lolChampSelect/ban/"+team+"/"+slot+"/completed", (binding, value) => {
    if (!value) 
      binding.dataContext[binding.attribute] = 0.8
    else 
      binding.dataContext[binding.attribute] = 1.0
  })  

  BindSetter(elem.style, "backgroundColor", "lolChampSelect/ban/"+team+"/"+slot+"/isInProgress", (binding, value) => {
    if (!value)
      binding.dataContext[binding.attribute] = null
    else {
      binding.dataContext[binding.attribute] = team == 1 ? "var(--team-left-color)" : "var(--team-right-color)"
    }
  })    
 
  BindSetter(elem.style, "backgroundImage", "lolChampSelect/ban/"+team+"/"+slot+"/championId", (binding, value) => {
    if (!value) 
      binding.dataContext[binding.attribute] = null
    else {
      var champ = _S.lolChampionData.byId[value]
      var url = GenerateSquareArtUrl(champ.id)
          
      binding.dataContext[binding.attribute] = "url( "+url+" )"
    }
  })   */
 
}

function CreateSlot(){
  return {
    "summonerName" : "N/A",
    "championName" : "",
    "active" : false,
    "finished" : false,
    "team" : 0,
    "image": ""
  }
}

function Main(){
  for (var i = 0; i < 5; i++){
    _S.pickElements[1].push(CreatePick(GetPickContainer(1)))
    _S.pickElements[2].push(CreatePick(GetPickContainer(2)))
    _S.banElements[1].push(CreateBan(GetBanContainer(1)))
    _S.banElements[2].push(CreateBan(GetBanContainer(2)))
    
    _S.picks[1].push(CreateSlot()) 
    _S.picks[2].push(CreateSlot()) 
    _S.bans[1].push(CreateSlot()) 
    _S.bans[2].push(CreateSlot()) 
    
    BindPick(1, i)
    BindPick(2, i)
    BindBan(1, i)
    BindBan(2, i)
  }
  
  preloadImage(GenerateSplashArtUrl, 0);
  preloadImage(GenerateSquareArtUrl, 0);

  //BindElementSetter(document, ".teaminfo-left .logo img", "src", "lolChampSelect/admin/leftTeamIcon")
  BindSetter(document.querySelector(".teaminfo-left .logo img"), "src", "lolChampSelect/admin/leftTeamIcon", ElementAttributeSetter(StringFormatConverter("assets/teams/{0}")))
  BindSetter(document.querySelector(".teaminfo-left .name p"), "innerHTML", "lolChampSelect/admin/leftTeamName", ElementAttributeSetter() )
  BindSetter(document.querySelector(".teaminfo-left .score p"), "innerHTML", "lolChampSelect/admin/leftTeamScore", ElementAttributeSetter() )
  BindSetter(document.documentElement.style, "--team-left-color", "lolChampSelect/admin/leftTeamColor", CssVariableSetter())
 
  BindSetter(document.querySelector(".teaminfo-right .logo img"), "src", "lolChampSelect/admin/rightTeamIcon", ElementAttributeSetter(StringFormatConverter("assets/teams/{0}")))
  BindSetter(document.querySelector(".teaminfo-right .name p"), "innerHTML", "lolChampSelect/admin/rightTeamName", ElementAttributeSetter() )
  BindSetter(document.querySelector(".teaminfo-right .score p"), "innerHTML", "lolChampSelect/admin/rightTeamScore", ElementAttributeSetter() )
  BindSetter(document.documentElement.style, "--team-right-color", "lolChampSelect/admin/rightTeamColor", CssVariableSetter())
 

  SendMessage("Subscribe","lolChampSelect/session")
  SendMessage("Subscribe","lolChampSelect/summoners")
  SendMessage("Subscribe","lolChampSelect/admin")
  initDone = true;
}