/* Check if A-Frame is available */
if (typeof AFRAME === "undefined") {
  throw new Error(
    "Component attempted to register before AFRAME was available."
  );
}

/* Check if AvatarConnect is available */
if (typeof AvatarConnect === "undefined") {
  throw new Error(
    "Component attempted to register before AvatarConnect was available."
  );
}

const PROVIDER_LOADERS = {
  "ready-player-me": function (avatarEl) {
    avatarEl.setAttribute("rig-animation", {
      remoteId:
        // TODO: Currently, this is bound to the animation file from the example. This should be generalized.
        this.data.metadata.outfitGender === "masculine"
          ? "animated-m"
          : "animated-f",
      clip: "IDLE",
      loop: "repeat",
      crossFadeDuration: 0,
    });
  },
};

/**
 * Main AvatarConnect A-Frame component. Handles AvatarConnect iFrame, receives data from the bridge and creates an avatar component based on received data.
 */
AFRAME.registerComponent("avatar-connect", {
  schema: {
    configuration: {
      default: "[]",
      parse: JSON.parse,
      stringify: JSON.stringify,
    },
    bridgeUrl: { type: "string", default: "https://v0.avatarconnect.org" },
    maxHeight: { type: "number", default: 610 },
    maxWidth: { type: "number", default: 800 },
    padding: { type: "number", default: 6 },
    showModal: { type: "boolean", default: true },
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: false,

  /**
   * Called once when component is attached. Generally for initial setup.
   */
  init: function () {
    this.connector = new AvatarConnect(this.data.configuration, {
      bridgeUrl: this.data.bridgeUrl,
      maxHeight: this.data.maxHeight,
      maxWidth: this.data.maxWidth,
      padding: this.data.padding,
    });

    this.connector.on("result", (bridgeResult) => {
      this.el.emit("avatar-connect:avatar-received", bridgeResult);
      this.createAvatar(bridgeResult);
      this.el.emit("avatar-connect:avatar-created", bridgeResult);
    });

    this.connector.on("error", (error) => {
      this.el.emit("avatar-connect:error", error);
      console.error(error);
    });

    this.connector.on("close", this.onCloseModal.bind(this));
    this.el.addEventListener(
      "avatar-connect:show-modal",
      this.onShowModal.bind(this)
    );

    if (this.data.showModal) {
      this.el.emit("avatar-connect:show-modal");
    }
  },

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
   */
  update: function (oldData) {},

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   * Generally undoes all modifications to the entity.
   */
  remove: function () {
    this.el.removeEventListener("avatar-connect:show-modal", onShowModal);
  },
  /**
   * Called on each scene tick.
   */
  // tick: function (t) { },

  /**
   * Called when entity pauses.
   * Use to stop or remove any dynamic or background behavior such as events.
   */
  pause: function () {
    this.el.removeEventListener("avatar-connect:show-modal", onShowModal);
  },

  /**
   * Called when entity resumes.
   * Use to continue or add any dynamic or background behavior such as events.
   */
  play: function () {
    this.el.addEventListener(
      "avatar-connect:show-modal",
      this.onShowModal.bind(this)
    );
  },

  /**
   * Event handlers that automatically get attached or detached based on scene state.
   */
  events: {
    // click: function (evt) { }
  },

  /**
   * Custom helper functions
   */
  onShowModal: function (event) {
    this.connector.enable();
  },
  onCloseModal: function (event) {
    this.el.emit("avatar-connect:close-modal");
  },
  createAvatar: function (bridgeResult) {
    var avatarEl = document.createElement("a-entity");
    avatarEl.setAttribute("avatar-connect-avatar", {
      providerId: bridgeResult.provider,
      uri: bridgeResult.avatar.uri,
      format: bridgeResult.avatar.format,
      showPodest: true,
      // TODO: Find a better way to provide JSON to a component.
      metadata: JSON.stringify(bridgeResult.metadata),
    });
    this.el.appendChild(avatarEl);
  },
});

/**
 * AvatarConnect avatar component. Creates an avatar in the scene based on data provided from AvatarConnect A-Frame component.
 */
AFRAME.registerComponent("avatar-connect-avatar", {
  schema: {
    providerId: { default: "", type: "string" },
    uri: { default: "", type: "string" },
    format: { default: "glb", type: "string" },
    metadata: {
      default: "{}",
      parse: JSON.parse,
      stringify: JSON.stringify,
    },
    showPodest: { default: true, type: "boolean" },
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: false,

  /**
   * Called once when component is attached. Generally for initial setup.
   */
  init: function () {
    if (this.data.uri) {
      this.createAvatar();
    } else {
      this.el.emit("avatar-connect:error", "Avatar URI is empty");
      console.error("URI is empty");
    }
  },

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
   */
  update: function (oldData) {},

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   * Generally undoes all modifications to the entity.
   */
  remove: function () {},
  /**
   * Called on each scene tick.
   */
  // tick: function (t) { },

  /**
   * Called when entity pauses.
   * Use to stop or remove any dynamic or background behavior such as events.
   */
  pause: function () {},

  /**
   * Called when entity resumes.
   * Use to continue or add any dynamic or background behavior such as events.
   */
  play: function () {},

  /**
   * Event handlers that automatically get attached or detached based on scene state.
   */
  events: {
    // click: function (evt) { }
  },

  /**
   * Custom helper functions
   */
  createAvatar: function () {
    var avatarEl = document.createElement("a-entity");
    // TODO: support more formats and providers
    switch (this.data.format) {
      case "glb":
      case "vrm":
        avatarEl.setAttribute("gltf-model", this.data.uri);
        break;
      default:
        return;
    }

    const providerLoader = PROVIDER_LOADERS[this.data.providerId];
    // Call the custom provider loader if it exists
    if (providerLoader) {
      providerLoader.call(this, avatarEl);
    }

    if (this.data.showPodest) {
      var discEl = document.createElement("a-entity");
      discEl.setAttribute("geometry", {
        primitive: "cylinder",
        height: 0.1,
        radius: 0.8,
      });
      discEl.setAttribute("material", {
        color: "grey",
        shader: "phong",
        reflectivity: 100,
        shininess: 100,
      });
      this.el.appendChild(discEl);
    }

    avatarEl.setAttribute(
      "position",
      this.data.showPodest ? "0 0.1 0" : "0 0 0"
    );

    this.el.appendChild(avatarEl);
  },
  deleteAvatar: function () {
    this.el.children[0].removeChild();
  },
});

/* Experimental rig component for RPM avatar */

const LoopMode = {
  once: THREE.LoopOnce,
  repeat: THREE.LoopRepeat,
  pingpong: THREE.LoopPingPong,
};
function wildcardToRegExp(s) {
  return new RegExp(`^${s.split(/\*+/).map(regExpEscape).join(".*")}$`);
}
function regExpEscape(s) {
  return s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

AFRAME.registerComponent("rig-animation", {
  schema: {
    remoteId: {
      default: "animated",
      type: "string",
    },
    clip: {
      default: "*",
      type: "string",
    },
    duration: {
      default: 0,
      type: "number",
    },
    clampWhenFinished: {
      default: !1,
      type: "boolean",
    },
    crossFadeDuration: {
      default: 0,
      type: "number",
    },
    loop: {
      default: "repeat",
      oneOf: Object.keys(LoopMode),
    },
    repetitions: {
      default: 1 / 0,
      min: 0,
    },
    timeScale: {
      default: 1,
    },
  },
  init() {
    (this.model = null),
      (this.remoteModel = null),
      (this.mixer = null),
      (this.activeActions = []);
    let { remoteId } = this.data;
    remoteId = remoteId.charAt(0) === "#" ? remoteId.slice(1) : remoteId;
    const remoteEl = document.getElementById(remoteId);
    remoteEl ||
      console.error(
        "ramx: Remote entity not found. Pass the ID of the entity, not the model."
      ),
      (this.model = this.el.getObject3D("mesh")),
      (this.remoteModel = remoteEl.getObject3D("mesh"));
    const tryToLoad = () => {
      this.model && this.remoteModel && this.load();
    };
    this.model
      ? tryToLoad()
      : this.el.addEventListener("model-loaded", (e) => {
          (this.model = e.detail.model), tryToLoad();
        }),
      this.remoteModel
        ? tryToLoad()
        : remoteEl.addEventListener("model-loaded", (e) => {
            (this.remoteModel = e.detail.model), tryToLoad();
          });
  },
  load() {
    const { el } = this;
    (this.model.animations = [...this.remoteModel.animations]),
      (this.mixer = new THREE.AnimationMixer(this.model)),
      this.mixer.addEventListener("loop", (e) => {
        el.emit("animation-loop", {
          action: e.action,
          loopDelta: e.loopDelta,
        });
      }),
      this.mixer.addEventListener("finished", (e) => {
        el.emit("animation-finished", {
          action: e.action,
          direction: e.direction,
        });
      }),
      this.data.clip && this.update({});
  },
  remove() {
    this.mixer && this.mixer.stopAllAction();
  },
  update(prevData) {
    if (!prevData) return;
    const { data } = this;
    const changes = AFRAME.utils.diff(data, prevData);
    if ("clip" in changes) {
      return this.stopAction(), void (data.clip && this.playAction());
    }
    this.activeActions.forEach((action) => {
      "duration" in changes &&
        data.duration &&
        action.setDuration(data.duration),
        "clampWhenFinished" in changes &&
          (action.clampWhenFinished = data.clampWhenFinished),
        ("loop" in changes || "repetitions" in changes) &&
          action.setLoop(LoopMode[data.loop], data.repetitions),
        "timeScale" in changes && action.setEffectiveTimeScale(data.timeScale);
    });
  },
  stopAction() {
    const { data } = this;
    for (let i = 0; i < this.activeActions.length; i++)
      data.crossFadeDuration
        ? this.activeActions[i].fadeOut(data.crossFadeDuration)
        : this.activeActions[i].stop();
    this.activeActions = [];
  },
  playAction() {
    if (!this.mixer) return;
    const { model } = this;
    const { data } = this;
    const clips = model.animations || (model.geometry || {}).animations || [];
    if (!clips.length) return;
    const re = wildcardToRegExp(data.clip);
    for (let clip, i = 0; (clip = clips[i]); i++) {
      if (clip.name.match(re)) {
        const action = this.mixer.clipAction(clip, model);
        (action.enabled = !0),
          (action.clampWhenFinished = data.clampWhenFinished),
          data.duration && action.setDuration(data.duration),
          data.timeScale !== 1 && action.setEffectiveTimeScale(data.timeScale),
          action
            .setLoop(LoopMode[data.loop], data.repetitions)
            .fadeIn(data.crossFadeDuration)
            .play(),
          this.activeActions.push(action);
      }
    }
  },
  tick(t, dt) {
    this.mixer && !Number.isNaN(dt) && this.mixer.update(dt / 1e3);
  },
});
