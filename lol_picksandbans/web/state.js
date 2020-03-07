const socket = new WebSocket('ws://localhost:9346');

var _S = {}

function StateOnUpdate(message){
  UpdatePath(_S, message.Path, JSON.parse(message.Content))
}

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

var bindings = {}


function defaultConverter(converter){
  return (binding, value) => {
    binding.dataContext[binding.attribute] = (converter ? converter(binding,value) : value)
  }
}

function stringFormatConverter(formatString){
  return (binding,value) => {
    return formatString.replace("{0}", value)
  }
}

function propertyCopyConverter(){
  return (binding, value) => {
    for(var prop in value){
      binding.dataContext[binding.attribute][prop] = value[prop]
    }
  }
}

function cssVariableConverter(){
   return (binding, value) => {
     binding.dataContext.setProperty(binding.attribute, value);
   }
}

function eventBroadcaster(event, dataContext, binding){
  dataContext.addEventListener(event, function() {
    var value = dataContext[binding.attribute].replace("<br>","")
    UpdatePath(dataContext, binding.path, value)
    SendMessage("Update", value,binding.path)
  } );
}

function BindSetter(dataContext, bindContext, binding){
  binding.path = bindContext+binding.path

  if (bindings[binding.path] == null)
    bindings[binding.path] = []

  if (binding.in == null)
    var setter = defaultConverter();
  else
    var setter = window[binding.in]()

  if (binding.out != null){
      eventBroadcaster(binding.out.length == 0 ? "input" : binding.out, dataContext, binding)
  }

  if (binding.attribute){
    if (binding.attribute.includes(".")){
      var splits = binding.attribute.split(".")
      for (var i = 0; i < splits.length-1; i++){
        dataContext = dataContext[splits[i]]
      }
      binding.attribute = splits[splits.length-1]
    }
  }

  var newBinding = {"dataContext" : dataContext, "attribute": binding.attribute, "path": binding.path, "setter" : setter };
  
  newBinding.setValue = function(value){
    newBinding.setter(newBinding, value)
  }
  
  bindings[binding.path].push(newBinding)
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

function UpdatePath(sender, path, object){
  var current = ResolvePath(path)
  
  current.object[current.attribute] = object;
  
  for(var boundPath in bindings){
   
    if (!boundPath.includes(path))
      continue;
     
    for (var i = 0; i < bindings[boundPath].length; i++){
        var binding = bindings[boundPath][i]
        
        if (binding.dataContext != sender){
          var bound = ResolvePath(binding.path)
        
          if (bound != null)
            binding.setValue(bound.value)
          else
            binding.setValue("")
        }
    }
  }
}

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

function getBindContext(elem){
  if (elem.bindContext)
    return elem.bindContext;
  return getBindContext(elem.parentElement)
}

function parseNotationDict(value){

  var dicts = []

  var bigSplits = value.split("{")
  for (k = 0; k < bigSplits.length; k++){
    
    var bind =  bigSplits[k].replace("}","").trim()
    
    if (bind.length > 0){
      var splits = bind.split(" ")
      
      var dict = {}
      for(var j = 0; j < splits.length; j++){
        var minisplits = splits[j].split("=")
        dict[minisplits[0]] = minisplits[1]
      }

      dicts.push(dict)
      
    }
  }

  return dicts;
}

function loadBindings(){

  var templatedElements = document.querySelectorAll('[template^="{"]');
  var templateElement = document.querySelectorAll("#templates")[0];

  if (templateElement){  
    for (var i = 0; i < templatedElements.length; i++){
      var elem = templatedElements[i]
      
      var dicts = parseNotationDict(elem.attributes.template.nodeValue)
      for (var k = 0; k < dicts.length; k++){
        
        var templateInfo = dicts[k]
        
        var templateHTML = document.querySelector("#templates ."+templateInfo.class).outerHTML
        
        for (var prop in templateInfo){
          if (prop != "class"){
            var re = new RegExp("{"+prop+"}","g");
        
            templateHTML = templateHTML.replace(re, templateInfo[prop])
          }
        }

        elem.outerHTML = templateHTML
        
      }

      elem.removeAttribute("template")
    }
    
    templateElement.remove()
  }
  var bindContexts =  document.querySelectorAll('[bind-context^="{"]');

  for (var i = 0; i < bindContexts.length; i++){
    var elem = bindContexts[i]
    elem.bindContext = elem.attributes["bind-context"].nodeValue.replace("{","").replace("}","")
    elem.removeAttribute("bind-context")
  }
  
  var boundElements = document.querySelectorAll('[bind^="{"]');

  for (var i = 0; i < boundElements.length; i++){
    var elem = boundElements[i]
    
    var context = getBindContext(elem)
    
    var dicts = parseNotationDict(elem.attributes.bind.nodeValue)
    
    for (var k = 0; k < dicts.length; k++){
      BindSetter(elem, context, dicts[k])
    }
    
    elem.removeAttribute("bind")
  }

}
