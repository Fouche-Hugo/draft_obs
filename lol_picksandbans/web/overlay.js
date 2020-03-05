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
  
  if (attributeName.includes(".")){
    var splits = attributeName.split(".")
    for (var i = 0; i < splits.length-1; i++){
      dataContext = dataContext[splits[i]]
    }
    attributeName = splits[splits.length-1]
  }
  
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
    
    if (!boundPath.includes(path))
      continue;
    
    for (var i = 0; i < bindings[boundPath].length; i++){
      var binding = bindings[boundPath][i]
        
        var bound = ResolvePath(binding.path)
        
        if (bound != null)
          binding.setValue(bound.value)
        else
          binding.setValue("")
      //}
    }
  }
}

// Listen for messages
socket.addEventListener('message', function (event) {
  var message = JSON.parse(event.data);
  
  if (message.Type == "Update"){
    console.log(message.Path)
    UpdatePath(message.Path, JSON.parse(message.Content))
    
    if (!initDone && message.Path == "lolChampionData"){
      Main();
    } else if (message.Path == "lolChampSelect/session") {
      UpdatePB();
    }

  }
});
//#endregion Socket

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

function GetCompletedActions(){
  var actions = _S.lolChampSelect.session.actions
  var complete = []
  
  for (var i = 0; i < actions.length ; i++){
    for(var k = 0; k < actions[i].length; k++){  
      var action = actions[i][k];
      if (action.completed == true){
        complete.push(action)
      }
    }
  }
  return complete;
}

function GetInProgressActions(){
  var actions = _S.lolChampSelect.session.actions
  var inProgress = []
  
  for (var i = 0; i < actions.length ; i++){
    for(var k = 0; k < actions[i].length; k++){  
      var action = actions[i][k];
      if (action.isInProgress == true){
        inProgress.push(action)
      }
    }
  }
  return inProgress;
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
      //ResetPicksAndBans();
      break;
    default:
  }
  
  SetPhaseText(newPhase)
}

function UpdateTimer(timer){
  if (timer && timer.timeLeftInPhaseInSec)
    phaseTimer = timer.timeLeftInPhaseInSec
}

function UpdateBan(i, teamid, bans, inProgress, completed,firstId){
  
  var slot = _S.bans[teamid][i];
  var member = bans[i]
  var actionId = (teamid-1)*5+i+firstId;
  var inProg = inProgress.filter((x) => x.id == actionId && x.type == "ban")
  var complete = completed.filter((x) => x.id == actionId && x.type == "ban")
  
  console.log(teamid, i, actionId, inProg.length, complete.length)
  
  if (inProg.length > 0){
    
    var inProgressAction = inProg[0]
    
    var champ = inProgressAction.championId > 0 ? champData().byId[inProgressAction.championId]  : null 
    
    slot.style = {
      opacity: 0.8,
      backgroundColor: champ == null ? (teamid == 1 ? "var(--team-left-color)" : "var(--team-right-color)") : null,
      backgroundImage:  champ == null ? null : "url("+GenerateSquareArtUrl(champ.id)+")",
    }       
  }
  if (complete.length > 0){

    var completeAction = complete[0]
    
    var champ = completeAction.championId > 0 ? champData().byId[completeAction.championId]  : null 
    
    slot.style = {
      opacity: 1,
      backgroundColor: champ == null ? (teamid == 1 ? "var(--team-left-color)" : "var(--team-right-color)") : null,
      backgroundImage:  champ == null ? null : "url("+GenerateSquareArtUrl(champ.id)+")",
    }    
  }
  
  UpdatePath("lolChampSelect/ban/"+teamid+"/"+i, slot) 
}

function UpdatePick(i, teamid, team, inProgress){
  var member = team[i]
  var slot = _S.picks[teamid][i];
  
  if (member == null)
  {
    slot.reset();
  } else {
    var isInProgress = inProgress.filter((x) => x.actorCellId == member.cellId && x.type == "pick")
    
    console.log(isInProgress)
    
    var champ = null
    
    if (isInProgress.length > 0){
      var inProgressAction = isInProgress[0]
      champ = inProgressAction.championId > 0 ? champData().byId[inProgressAction.championId]  : null
    }  else{
      champ = member.championId > 0 ? champData().byId[member.championId]  : null
    }
    
    var champName = member.championId > 0 ? champData().byId[member.championId].name : null
    
    var splashArtTransform = champ == null ? null :_S.lolChampionData.splash.horizontal[champ.id]
    
    slot.style = {
      opacity: inProgressAction ? 0.8 : 1,
      backgroundColor: inProgressAction && champ == null ? (member.team == 1 ? "var(--team-left-color)" : "var(--team-right-color)") : null,
      backgroundImage:  champ == null ? null : "url("+GenerateSplashArtUrl(champ.id)+")",
      transform: splashArtTransform == null ? null : splashArtTransform.transform,
      backgroundPositionX: splashArtTransform == null ? null : splashArtTransform.backgroundPositionX,
      backgroundPositionY: splashArtTransform == null ? null : splashArtTransform.backgroundPositionY
    }
    
    slot.summonerName = GetSummonerName(member.summonerId, member.cellId)
    slot.championName = champ ? champ.name : null
    slot.layout = inProgressAction && champ == null ? "during-initial" : champ != null  ? "after-initial" : ""
  }
  
  UpdatePath("lolChampSelect/pick/"+teamid+"/"+i, slot)
}

function UpdatePB(){
  age++;
  age = age%500;
  
  var cs = _S.lolChampSelect.session;
  var actions = cs.actions;
  var myTeam = cs.myTeam
  var theirTeam = cs.theirTeam
  var bans = cs.bans
  
  UpdateTimer(cs.timer)
  UpdatePhase(DeterminePhase(cs.timer ? cs.timer.phase : "", actions))
  
  if (myTeam.length == 0)
    return;
  
  var inProgress = GetInProgressActions();
  var completed = GetCompletedActions();
  var myTeamId = myTeam[0].team
  var theirTeamId = myTeamId == 1 ? 2 : 1
  
  var firstBan = actions[0].filter((x) => x.type=="ban" )
  
  if (firstBan.length > 0)
    var firstBanId  = firstBan[0].id
  
  for(var i = 0; i < 5; i++){
      UpdatePick(i, myTeamId, myTeam, inProgress)
      UpdatePick(i, theirTeamId, theirTeam, inProgress)
      UpdateBan(i, myTeamId, bans.myTeamBans, inProgress,completed,firstBanId)
      UpdateBan(i, theirTeamId, bans.theirTeamBans, inProgress,completed,firstBanId)
  }
}

//#region DataContext
function GenerateSplashArtUrl(championId){
  return "/assets/cdragon/champion/"+championId+"/splash-art/centered";
}

function GenerateSquareArtUrl(championId){
  return "/assets/cdragon/champion/"+championId+"/square.png"
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

function layoutConverter(){
  return (binding, value) => {
    if (binding.layout != value){
      ReplaceStyles(binding.dataContext, value, Layouts)
      binding.layout = value
    }
  }
}

function propertyCopyConverter(){
  return (binding, value) => {
    
    for(var prop in value){
      binding.dataContext[binding.attribute][prop] = value[prop]
    }
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

function CreateSlot(){
  var _this = {}
  
  _this.reset = () => {
    for (var prop in _this){
      if (prop != "reset")
        _this[prop] = null
    }
    _this.style = {
      opacity: 1,
      backgroundColor: "",
      backgroundImage:  "",
      transform: "",
      backgroundPositionX: "",
      backgroundPositionY: "",
    }   
  }
  
  return _this;
}

function teamLogoConverter(){
  return ElementAttributeSetter(StringFormatConverter("assets/teams/{0}"))
}

function urlConverter(){
  return ElementAttributeSetter(StringFormatConverter("url('{0}')"))
}

function getBindContext(elem){
  if (elem.bindContext)
    return elem.bindContext;
  return getBindContext(elem.parentElement)
}

function Main(){
  for (var i = 0; i < 5; i++){
    _S.picks[1].push(CreateSlot()) 
    _S.picks[2].push(CreateSlot()) 
    _S.bans[1].push(CreateSlot()) 
    _S.bans[2].push(CreateSlot()) 
  }
  
  preloadImage(GenerateSplashArtUrl, 0);
  preloadImage(GenerateSquareArtUrl, 0);


  var bindContexts =  document.querySelectorAll('[bind-context^="{"]');

  for (var i = 0; i < bindContexts.length; i++){
    var elem = bindContexts[i]
    elem.bindContext = elem.attributes["bind-context"].nodeValue.replace("{","").replace("}","")
    //elem.removeAttribute("bind-context")
  }
  
  var bindings = document.querySelectorAll('[bind^="{"]');

  for (var i = 0; i < bindings.length; i++){
    var elem = bindings[i]
    
    var context = getBindContext(elem)
    
    var value = elem.attributes.bind.nodeValue

    var bigSplits = value.split("{")
    for (k = 0; k < bigSplits.length; k++){
      var bind =  bigSplits[k].replace("}","").trim()
      
      var splits = bind.split(" ")
      
      if (splits.length > 1){
        
        var setter = splits.length > 2 ? window[splits[2]]() : ElementAttributeSetter()
        BindSetter(elem, splits[0], context+splits[1], setter)
      }
    }
    
    //elem.removeAttribute("bind")
  }

  SendMessage("Subscribe","lolChampSelect/session")
  SendMessage("Subscribe","lolChampSelect/summoners")
  SendMessage("Subscribe","lolChampSelect/admin")
  initDone = true;
}