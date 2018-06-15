// jshint ignore: start
// jscs: disable
ace.define("ace/mode/stackdriver_highlight_rules", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text_highlight_rules"], function (require, exports, module) {
  "use strict";

  var oop = require("../lib/oop");
  var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

  var StackdriverLoggingHighlightRules = function () {
    var keywords = (
      "AND|OR|NOT"
    );

    var builtinConstants = (
      "true|false"
    );

    var builtinFunctions = (
      "starts_with|ends_with|has_substring|one_of"
    );

    var keywordMapper = this.createKeywordMapper({
      "support.function": builtinFunctions,
      "keyword": keywords,
      "constant.language": builtinConstants
    }, "identifier", true);

    this.$rules = {
      "start": [{
        token: "string.quoted",
        regex: '"[^"]*"'
      }, {
        token: "string", // single line
        regex: /"(?:[^"\\]|\\.)*?"/
      }, {
        token: "string", // string
        regex: "'.*?'"
      }, {
        token: "constant.numeric", // float
        regex: "[-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
      }, {
        token: keywordMapper,
        regex: "[a-zA-Z][a-zA-Z_\\.]*\\b"
      }, {
        token: "keyword.operator",
        regex: ":|>=|<=|>|<|!=|="
      }, {
        token: "paren.lparen",
        regex: "[(]"
      }, {
        token: "paren.rparen",
        regex: "[)]"
      }, {
        token: "text",
        regex: "\\s+"
      }]
    };

    this.normalizeRules();
  };

  oop.inherits(StackdriverLoggingHighlightRules, TextHighlightRules);

  exports.StackdriverLoggingHighlightRules = StackdriverLoggingHighlightRules;
});

ace.define("ace/mode/stackdriver_completions", ["require", "exports", "module", "ace/token_iterator", "ace/lib/lang"], function (require, exports, module) {
  "use strict";

  var lang = require("../lib/lang");

  var stackdriverKeyWords = [
    'starts_with', 'ends_with', 'has_substring', 'one_of', 'AND', 'OR', 'NOT'
  ];

  var keyWordsCompletions = stackdriverKeyWords.map(function (word) {
    return {
      caption: word,
      value: word,
      meta: "keyword",
      score: Number.MAX_VALUE
    }
  });

  function wrapText(str, len) {
    len = len || 60;
    var lines = [];
    var space_index = 0;
    var line_start = 0;
    var next_line_end = len;
    var line = "";
    for (var i = 0; i < str.length; i++) {
      if (str[i] === ' ') {
        space_index = i;
      } else if (i >= next_line_end && space_index != 0) {
        line = str.slice(line_start, space_index);
        lines.push(line);
        line_start = space_index + 1;
        next_line_end = i + len;
        space_index = 0;
      }
    }
    line = str.slice(line_start);
    lines.push(line);
    return lines.join("&nbsp<br>");
  }

  function convertMarkDownTags(text) {
    text = text.replace(/```(.+)```/, "<pre>$1</pre>");
    text = text.replace(/`([^`]+)`/, "<code>$1</code>");
    return text;
  }

  function convertToHTML(item) {
    var docText = lang.escapeHTML(item.docText);
    docText = convertMarkDownTags(wrapText(docText, 40));
    return [
      "<b>", lang.escapeHTML(item.def), "</b>", "<hr></hr>", docText, "<br>&nbsp"
    ].join("");
  }

  var StackdriverLoggingCompletions = function () { };

  (function () {
    this.getCompletions = function (state, session, pos, prefix, callback) {
      var token = session.getTokenAt(pos.row, pos.column);
      if (token.type === 'identifier' || token.type === 'string.quoted') {
        return callback(null, []);
      }

      var completions = keyWordsCompletions;
      callback(null, completions);
    };

  }).call(StackdriverLoggingCompletions.prototype);

  exports.StackdriverLoggingCompletions = StackdriverLoggingCompletions;
});

ace.define("ace/mode/behaviour/stackdriver", ["require", "exports", "module", "ace/lib/oop", "ace/mode/behaviour", "ace/mode/behaviour/cstyle", "ace/token_iterator"], function (require, exports, module) {
  "use strict";

  var oop = require("../../lib/oop");
  var Behaviour = require("../behaviour").Behaviour;
  var CstyleBehaviour = require("./cstyle").CstyleBehaviour;
  var TokenIterator = require("../../token_iterator").TokenIterator;

  function getWrapped(selection, selected, opening, closing) {
    var rowDiff = selection.end.row - selection.start.row;
    return {
      text: opening + selected + closing,
      selection: [
        0,
        selection.start.column + 1,
        rowDiff,
        selection.end.column + (rowDiff ? 0 : 1)
      ]
    };
  };

  var StackdriverLoggingBehaviour = function () {
    this.inherit(CstyleBehaviour);
  }
  oop.inherits(StackdriverLoggingBehaviour, CstyleBehaviour);

  exports.StackdriverLoggingBehaviour = StackdriverLoggingBehaviour;
});

ace.define("ace/mode/stackdriver", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/mode/stackdriver_highlight_rules"], function (require, exports, module) {
  "use strict";

  var oop = require("../lib/oop");
  var TextMode = require("./text").Mode;
  var StackdriverLoggingHighlightRules = require("./stackdriver_highlight_rules").StackdriverLoggingHighlightRules;
  var StackdriverLoggingCompletions = require("./stackdriver_completions").StackdriverLoggingCompletions;
  var StackdriverLoggingBehaviour = require("./behaviour/stackdriver").StackdriverLoggingBehaviour;

  var Mode = function () {
    this.HighlightRules = StackdriverLoggingHighlightRules;
    this.$behaviour = new StackdriverLoggingBehaviour();
    this.$completer = new StackdriverLoggingCompletions();
    // replace keyWordCompleter
    this.completer = this.$completer;
  };
  oop.inherits(Mode, TextMode);

  (function () {

    this.$id = "ace/mode/stackdriver";
  }).call(Mode.prototype);

  exports.Mode = Mode;

});
