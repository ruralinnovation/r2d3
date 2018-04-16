function R2D3(el, width, height) {
  var self = this;
  var x = null;
  var version = null;
  
  self.data = null;
  self.root = self.svg = self.canvas = null;
  self.width = 0;
  self.height = 0;
  self.options = null;
  self.resizer = null;
  self.renderer = null;
  self.rendererDefaut = true;
  self.captureErrors = null;
  
  self.setX = function(newX) {
    x = newX;
    self.data = x.data;
    
    if (x.type == "data.frame") {
      self.data = HTMLWidgets.dataframeToD3(self.data);
    }
    
    self.options = x.options;
  };
  
  self.setContainer = function(container) {
    self.container = container;
  };
  
  self.setRoot = function(root) {
    self.root = self.svg = self.canvas = root;
  };
  
  self.createRoot = function() {
    if (self.root !== null) {
      self.d3().select(el).select(self.container).remove();
      self.root = null;
    }
    
    var root = self.d3().select(el).append(self.container)
      .attr("width", self.width)
      .attr("height", self.height);
      
    self.setRoot(root);
  };
  
  self.setWidth = function(width) {
    self.width = width;
  };
  
  self.setHeight = function(height) {
    self.height = height;
  };
  
  self.onRender = function(renderer) {
    self.renderer = renderer;
    self.rendererDefaut = false;
  };
  
  self.onResize = function(resizer) {
    self.resizer = resizer;
  };
  
  self.render = function() {
    if (self.renderer === null) return;
    
    try {
      self.renderer(self.data, self.root, self.width, self.height, self.options);
    }
    catch (err) {
      self.showError(err.message, err.stack, null, null);
    }
  };
  
  self.resize = function() {
    if (self.resizer === null) return;
    try {
      self.resizer(self.width, self.height);
    }
    catch (err) {
      self.showError(err.message, err.stack, null, null);
    }
  };
  
  self.addScript = function(script) {
    var el = document.createElement("script");
    el.type = "text/javascript";
    el.text = script;
    
    self.captureErrors = function(msg, url, lineNo, columnNo, error) {
      self.showError(msg, null, lineNo, columnNo);
    };

    document.head.appendChild(el);
    self.captureErrors = null;
  };
  
  self.addStyle = function(style) {
    if (!style) return;
    
    var el = document.createElement("style");
            
    el.type = "text/css";
    if (el.styleSheet) {
      el.styleSheet.cssText = style;
    } else {
      el.appendChild(document.createTextNode(style));
    }
    
    document.head.appendChild(el);
  };
  
  self.setVersion = function(newVersion) {
    version = newVersion;
  };
  
  self.d3 = function() {
    switch(version) {
      case 3:
        return d3;
      case 4:
        return d3v4;
      case 5:
        return d3v5;
    }
  };
  
  self.callD3Script = function() {
    var d3Script = self.d3Script;
    
    try {
      d3Script(self.d3(), self, self.data, self.root, self.width, self.height, self.options);
    }
    catch (err) {
      self.showError(err.message, err.stack, null, null);
    }
  };
  
  self.widgetRender = function(x) {
    self.setX(x);
    self.setWidth(width);
    self.setHeight(height);
    
    if (!self.root) {
      self.setVersion(x.version);
      self.addScript(x.script);
      self.addStyle(x.style);
      self.d3Script = d3Script;
      self.setContainer(x.container);
      
      self.createRoot();
      
      self.callD3Script();
    }
    
    self.render();
    
    if (self.renderer === null) {
      self.onRender(function(data, container, width, height, options) {
        self.callD3Script();
      });
    }
    
    if (self.resizer === null) {
      self.resizer = function(width, height) {
        self.createRoot();
        self.callD3Script();
        if (!self.rendererDefaut) self.render();
      };
    }
  };
  
  self.debounce = function(f, wait) {
    var timeout = null;
    return function() {
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(f, wait);
    };
  };
  
  self.resizeDebounce = self.debounce(self.resize, 100);
  
  self.widgetResize = function(width, height) {
    self.root
      .attr("width", width)
      .attr("height", height);

    self.setWidth(width);
    self.setHeight(height);
    
    self.resizeDebounce();
  };
  
  var openSource = function(filename, line, column) {
    if (window.parent.postMessage) {
      window.parent.postMessage({
        message: "openfile",
        source: "r2d3",
        file: filename,
        line: line,
        column: column
      }, window.location.origin);
    }
  };
  
  self.showError = function(message, callstack, line, column) {
    el.innerHTML = "";
    
    if (line === null || column === null) {
      var reg = new RegExp("at d3Script \\(<anonymous>:([0-9]+):([0-9]+)\\)");
      var matches = reg.exec(callstack);
      if (matches.length === 3) {
        line = parseInt(matches[1]);
        column = parseInt(matches[2]);
      }
    }
    
    var location = null;
    var lines = x.script.split("\n");
    var fileLine = null;
    var header = "// R2D3 Source File: ";
    for (var maybe = line; maybe >= 0; maybe--) {
      if (lines[maybe].includes(header)) {
        var data = lines[maybe].split(header)[1];
        var source = data.split(":")[0].trim();
        var offset = data.split(":")[1];
        fileLine = (line - (maybe + 1) + parseInt(offset));
        location = source;
      }
    }
    
    if (location) {
      message = message + " in ";
    }
    
    var container = document.createElement("div");
    container.innerHTML = message;
    container.style.fontFamily = "'Lucida Sans', 'DejaVu Sans', 'Lucida Grande', 'Segoe UI', Verdana, Helvetica, sans-serif, serif";
    container.style.fontSize = "9pt";
    container.style.border = "solid 1px #CCCCCC";
    container.style.padding = "5px";
    container.style.margin = "10px";
    container.style.background = "#FEFEFE";
    container.style.color = "#444";
    
    if (location) {
      var linkEl = document.createElement("a");
      linkEl.innerHTML = location + "#" + fileLine + ":" + column;
      linkEl.href = "#";
      linkEl.onclick = function() {
        openSource(location, fileLine, column);
      };
      container.appendChild(linkEl);
    }
    
    el.appendChild(container);
    
    var stack = document.createElement("div");
    stack.innerHTML = callstack;
    stack.style.display = "none";
    container.appendChild(stack);
  };
  
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    if (self.captureErrors) {
      self.captureErrors(msg, url, lineNo, columnNo, error);
    }
    
    return false;
  };
}