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
  syncMenu();
  renderer.setAnimationLoop(frame);
