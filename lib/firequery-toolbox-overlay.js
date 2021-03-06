/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "stable"
};

// Add-on SDK
const options = require("@loader/options");
const { Cu, Ci } = require("chrome");
const { Class } = require("sdk/core/heritage");
const { defer, resolve } = require("sdk/core/promise");
const { on, off, emit } = require("sdk/event/core");

// DevTools
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");

// Firebug SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { ToolboxOverlay } = require("firebug.sdk/lib/toolbox-overlay.js");
const { Rdp } = require("firebug.sdk/lib/core/rdp.js");

// FireQuery
const { FireQueryFront } = require("./firequery-front");

// URL of the {@FireQueryActor} module. This module will be
// installed and loaded on the backend.
const actorModuleUrl = options.prefixURI + "lib/firequery-actor.js";

/**
 * @overlay This object represents an overlay for the Toolbox. The
 * overlay is created when the Toolbox is opened and destroyed when
 * the Toolbox is closed. There is one instance of the overlay per
 * Toolbox, and so there can be more overlay instances created per
 * one browser session.
 *
 * FireQuery uses the overlay to register and attach/detach the
 * backend actor.
 */
const FireQueryToolboxOverlay = Class(
/** @lends FireQueryToolboxOverlay */
{
  extends: ToolboxOverlay,

  overlayId: "FireQueryToolboxOverlay",

  // Initialization

  initialize: function(options) {
    ToolboxOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("FireQueryToolboxOverlay.initialize;", options);
  },

  destroy: function() {
    ToolboxOverlay.prototype.destroy.apply(this, arguments);

    Trace.sysout("FireQueryToolboxOverlay.destroy;", arguments);

    this.detach();
  },

  // Events

  onReady: function(options) {
    ToolboxOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("FireQueryToolboxOverlay.onReady;", options);

    this.attach();
  },

  // Backend

  /**
   * Attach to the backend FireQuery actor.
   */
  attach: makeInfallible(function() {
    Trace.sysout("ConsoleOverlay.attach;");

    if (this.deferredAttach) {
      return this.deferredAttach.promise;
    }

    let config = {
      prefix: FireQueryFront.prototype.typeName,
      actorClass: "FireQueryActor",
      frontClass: FireQueryFront,
      moduleUrl: actorModuleUrl
    };

    this.deferredAttach = defer();
    let client = this.toolbox.target.client;

    // Register as tab actor.
    Rdp.registerTabActor(client, config).then(({registrar, front}) => {
      FBTrace.sysout("ConsoleOverlay.attach; READY", front);

      this.front = front;

      // xxxHonza: Unregister at shutdown
      this.registrar = registrar;

      // Emit an event indicating that the attach process is done. This
      // can be used e.g. by tests.
      emit(this, "attached", front);

      // Resolve the 'attach promise'.
      this.deferredAttach.resolve(front);
    });

    return this.deferredAttach.promise;
  }),

  detach: makeInfallible(function() {
    Trace.sysout("ConsoleOverlay.detach;");

    // xxxHonza: TODO

    // Emit an event indicating that the attach process is done. This
    // can be used e.g. by tests.
    emit(this, "attached", front);
  }),

  getJQueryFront: function() {
    return this.attach();
  },
});

// Exports from this module
exports.FireQueryToolboxOverlay = FireQueryToolboxOverlay;
