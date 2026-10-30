  // ---------- Start ----------

  fitCamera();
  placeRooms();
  buildRegion(regions.lobby);
  {
    const s = ROOMS.lobby.spawn;
    me.x = s.x;
    me.z = s.z;
    me.yaw = s.yaw;
    me.pitch = s.pitch;
  }
  enter(regions.lobby, { quiet: true });
  if (EMBED) {
    // Opened from the site: no title screen; wait in the lobby, facing the
    // window, until the site hands over (95-site.js). Nothing is drawn till
    // then: the frame may sit loaded and unseen for a long while.
    titleEl.hidden = true;
    syncMenu();
    parent.postMessage({ type: "gallery:ready" }, "*");
  } else {
    // You start out on the lighthouse gallery, at the railing in the storm.
    goTo("lighthouse", "gallery");
    syncMenu();
    renderer.setAnimationLoop(frame);
  }
