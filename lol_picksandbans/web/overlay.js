var Layouts = ["five-medium","five-big", "three-small-two-big", "three-big-two-small", "small-picks","truncated-picks", "three-big","during-initial","after-initial"]
var Locations = ["top", "bottom"]
var States = ["gone"]

var lolv = "10.4.1"

var championsById = {}
var championsByIndex = []

function adminData() {
    if (!_S.lolChampSelect.admin)
        _S.lolChampSelect.admin = {}

    return _S.lolChampSelect.admin;
}


_S.picks = {1: [], 2: []}
_S.bans = {1: [], 2: []}
_S.pickElements = {1: [], 2: []}
_S.banElements = {1: [], 2: []}

_S.myTeamBanCount = 0
_S.theirTeamBanCount = 0

var initDone = false;
var epoch = 0;
var phaseTimer = 0;
var lastPhase = ""

setInterval(function() {
  phaseTimer -= 100
  
  if (phaseTimer < 0)
    phaseTimer = 0;
  
  SetTimerText(phaseTimer)
},100);

function Log(...arr){
  console.log(arr)
}

function UpdateChampionData() {
    Log("/assets/cdragon/" + adminData().version + "/data/en_US/championFull.json")
    fetch("/assets/cdragon/" + adminData().version + "/data/en_US/championFull.json")
        .then(res => res.json())
        .then((out) => {
            championMap = out.data;
            
            for (var k in championMap) {
                championsById[championMap[k].key] = championMap[k]
                championsByIndex.push(championMap[k])
            }
        })
}


// Connection opened
socket.addEventListener('open', function (event) {
    SendMessage("Subscribe","lolChampionData")
});

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

// Listen for messages
socket.addEventListener('message', function (event) {
  var message = JSON.parse(event.data);
  console.log(message)
  if (message.Type == "Update"){

    StateOnUpdate(message)
    
    if (!initDone && message.Path == "lolChampionData"){
        Main();
    } else if (message.Path == "lolChampSelect/session") {
      UpdatePB();
      } else if (message.Path == "lolChampSelect/admin" ) {
        UpdateChampionData()
    }

  }
});
//#endregion Socket

function SetTimerText(seconds){
  var timer = document.getElementsByClassName("countdown")[0]
  timer.innerHTML = (seconds/1000).toFixed(0)
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

function GetTeamActions(allied, type){
  var actions = _S.lolChampSelect.session.actions
  var inProgress = []
  
  for (var i = 0; i < actions.length ; i++){
    for(var k = 0; k < actions[i].length; k++){  
      var action = actions[i][k];
      if (action.type == type && action.isAllyAction == allied){
        inProgress.push(action)
      }
    }
  }
  return inProgress;
}

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

function safeBanCount(){
  if (_S && _S.lolChampSelect && _S.lolChampSelect.session && _S.lolChampSelect.session.bans && _S.lolChampSelect.session.bans.myTeam)
    return _S.lolChampSelect.session.bans.myTeam.length;
  return 0;
}

function UpdatePhase(newPhase){
  if (lastPhase == newPhase)
    return false;
  
  console.log(newPhase)
  switch(newPhase){
    case "Pick Phase":
      if (!_S.lolChampSelect.session.hasSimultaneousPicks && !_S.lolChampSelect.session.hasSimultaneousBans){
        if (_S.myTeamBanCount <= 3)
          setTimeout(function() { SetLayout("pro","p2") }, 1500);   
        else
          setTimeout(function() { SetLayout("pro","p4") }, 1500);  
      } else
        setTimeout(function() { SetLayout("soloqueue","picks") }, 1500); 
      break;
    case "Ban Phase":
      if (_S.myTeamBanCount > 1)
        setTimeout(function() { SetLayout("pro","p3") }, 1500);   
      else if (!_S.lolChampSelect.session.hasSimultaneousBans)
        setTimeout(function() { SetLayout("pro","p1") }, 1500);   
      else     
        setTimeout(function() { SetLayout("soloqueue","bans") }, 1500); 
      break;
    case "Planning":
      SetLayout("header")
      break;
    case "Game Starting":
      SetLayout("header")
      break;
    case "Waiting":
      SetLayout("reset")
      break;
    default:
  }
  
  lastPhase = newPhase

  SetPhaseText(newPhase)
}

function UpdateTimer(timer){
  
  if (timer && timer.adjustedTimeLeftInPhase){
    phaseTimer = -(Date.now()-_S.lolChampSelect.session.timer.internalNowInEpochMs-_S.lolChampSelect.session.timer.adjustedTimeLeftInPhase)
  }
    
}

function UpdateBan(i, teamid, action){

  //console.log(i, teamid, action)
  var slot = _S.bans[teamid][i];

  if (action == null){
    slot.style = {
      opacity: null,
      backgroundColor: null,
      backgroundImage: null
    }
  } else if (action.isInProgress) {
      var champ = action.championId > 0 ? championsById[action.championId] : null
    
    slot.style = {
      opacity: 0.8,
      backgroundColor: champ == null ? (teamid == 1 ? "var(--team-left-color)" : "var(--team-right-color)") : null,
      backgroundImage:  champ == null ? null : "url("+GenerateSquareArtUrl(champ.id)+")",
    }   
  } else{
      var champ = action.championId > 0 ? championsById[action.championId]  : null
    
    slot.style = {
      opacity: 1,
      backgroundColor: champ == null ? (teamid == 1 ? "var(--team-left-color)" : "var(--team-right-color)") : null,
      backgroundImage:  champ == null ? null : "url("+GenerateSquareArtUrl(champ.id)+")",
    }   
  }

  UpdatePath(null, "lolChampSelect/ban/"+teamid+"/"+i, slot) 

}

function UpdatePick(i, teamid, team, inProgress){
  var member = team[i]
  var slot = _S.picks[teamid][i];
  
  if (member == null)
  {
    slot.reset();
  } else {
    var isInProgress = inProgress.filter((x) => x.actorCellId == member.cellId && x.type == "pick")
    
    var champ = null
    
    if (isInProgress.length > 0){
      var inProgressAction = isInProgress[0]
        champ = inProgressAction.championId > 0 ? championsById[inProgressAction.championId]  : null
    }  else{
        champ = member.championId > 0 ? championsById[member.championId]  : null
    }
    
      var champName = member.championId > 0 ? championsById[member.championId].name : null
    
    var splashArtTransform = champ == null ? null :_S.lolChampionData.splash.horizontal[champ.id]

    if (splashArtTransform == null) {
          splashArtTransform = _S.lolChampionData.splash.horizontal["Ahri"]
    }

    slot.flex = inProgressAction ? "3" : null
    
    slot.style = {
      opacity: inProgressAction ? 0.8 : 1,
      backgroundColor: inProgressAction && champ == null ? (member.team == 1 ? "var(--team-left-color)" : "var(--team-right-color)") : null,
      backgroundImage:  champ == null ? null : "url("+GenerateSplashArtUrl(champ.id)+")",
      transform: splashArtTransform == null ? null : splashArtTransform.transform,
      backgroundPositionX: splashArtTransform == null ? null : splashArtTransform.backgroundPositionX,
      backgroundPositionY: splashArtTransform == null ? null : splashArtTransform.backgroundPositionY,
    }
    
    if (_S.lolChampSelect.admin && _S.lolChampSelect.admin.positions && _S.lolChampSelect.admin.positions[teamid] && _S.lolChampSelect.admin.positions[teamid][i] != "auto")
    {
      slot.positionBackgroundImage = "url( "+"assets/roles/role-"+_S.lolChampSelect.admin.positions[teamid][i]+".png"+" )"
    } else{
      slot.positionBackgroundImage = "url( "+"assets/roles/role-"+(member.assignedPosition == "" ?  "fill" : member.assignedPosition)+".png"+" )"
    }

    slot.summonerName = GetSummonerName(member.summonerId, member.cellId)
    slot.championName = champ ? champ.name : null
    slot.layout = inProgressAction && champ == null ? "during-initial" : champ != null  ? "after-initial" : ""
  }
  
  UpdatePath(null,"lolChampSelect/pick/"+teamid+"/"+i, slot)
}

function UpdatePB(){
  epoch++;
  elkcb = epoch%500;
  
  var cs = _S.lolChampSelect.session;
  var actions = cs.actions;
  var myTeam = cs.myTeam
  var theirTeam = cs.theirTeam
  var bans = cs.bans
  
  UpdateTimer(cs.timer)
  UpdatePhase(DeterminePhase(cs.timer ? cs.timer.phase : "", actions))
  
  if (myTeam.length == 0 || actions.length == 0){
    _S.myTeamBanCount = 0
    _S.theirTeamBanCount = 0
    return;
  }
    
  var inProgress = GetInProgressActions();
  var completed = GetCompletedActions();
  var myTeamId = myTeam[0].team
  var theirTeamId = myTeamId == 1 ? 2 : 1
  
  var firstBan = actions[0].filter((x) => x.type=="ban" )
  
  if (firstBan.length > 0)
    var firstBanId  = firstBan[0].id
  
  var myTeamBanActions = GetTeamActions(true, "ban")
  var theirTeamBanActions = GetTeamActions(false, "ban")


  _S.myTeamBanCount = myTeamBanActions.filter(x => x.completed).length
  _S.theirTeamBanCount = theirTeamBanActions.filter(x => x.completed).length

  for(var i = 0; i < 5; i++){
      UpdatePick(i, myTeamId, myTeam, inProgress)
      UpdatePick(i, theirTeamId, theirTeam, inProgress)
      UpdateBan(i, myTeamId, myTeamBanActions[i])
      UpdateBan(i, theirTeamId, theirTeamBanActions[i])
  }

  /*var myBans = {}

  for (var i = 0; i < 5; i++){
    var action = myTeamBanActions[i]
    UpdateBan(i, myTeamId, bans.myTeamBans, inProgress,completed,firstBanId)
  }

  for (var i = 0; i < theirTeamBans.length; i++){
    UpdateBan(theirTeamId, bans.myTeamBans, inProgress,completed,firstBanId)
  }*/

}

//#region DataContext
function GenerateSplashArtUrl(championId) {
    if (championId == "Fiddlesticks")
        return "/assets/cdragon/img/champion/centered/FiddleSticks_0.jpg";
    else
        return "/assets/cdragon/img/champion/centered/" + championId + "_0.jpg";
}

function GenerateSquareArtUrl(championId) {
    if (championId == "Fiddlesticks")
        return "/assets/cdragon/img/champion/tiles/FiddleSticks_0.jpg"
    else
        return "/assets/cdragon/img/champion/tiles/" + championId + "_0.jpg"
}

function GetSummonerName(summonerId, cellId){
  var summonerMap = _S.lolChampSelect.summoners;
  
  if (summonerMap == null)
    return "N/A"
  
  if (summonerId == 0 || !summonerMap[summonerId])
    return "Summoner "+(cellId+1);
  
  return summonerMap[summonerId].displayName
}

function SetLayout(type, phase){
  console.log(type, phase)
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
      SetClassLayout("header","", "", "")
      SetClassLayout("bans","three-big", "top", "gone")
      SetClassLayout("bans","three-big", "top", "", 500)
      SetClassLayout("picks","","", "gone");
    }
    if (phase == "p2"){
      SetClassLayout("bans","five-big", "top", "gone")
      SetClassLayout("bans","five-medium", "bottom", "gone", 500)
      SetClassLayout("bans","three-big", "bottom", "", 1200)
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
 
    if (id < championsByIndex.length){
    splashPreloader.addEventListener('load', onload)
      splashPreloader.src = CreationFunc(championsByIndex[id].id)
    
  };
}


function layoutConverter(){
  return (binding, value) => {
    if (binding.layout != value){
      ReplaceStyles(binding.dataContext, value, Layouts)
      binding.layout = value
    }
  }
}

function teamLogoConverter(){
  return defaultConverter(stringFormatConverter("assets/teams/{0}"))
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

function Main(){
  for (var i = 0; i < 5; i++){
    _S.picks[1].push(CreateSlot()) 
    _S.picks[2].push(CreateSlot()) 
    _S.bans[1].push(CreateSlot()) 
    _S.bans[2].push(CreateSlot()) 
  }
  
  preloadImage(GenerateSplashArtUrl, 0);
  preloadImage(GenerateSquareArtUrl, 0);

  SendMessage("Subscribe", "lolChampSelect/admin")
  SendMessage("Subscribe","lolChampSelect/session")
  SendMessage("Subscribe","lolChampSelect/summoners")
  
  initDone = true;
}

loadBindings();