#if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0 && !defined(DEPTH_PASS)
  vec4 shadowPosition =
    worldPosition + vec4(shadowNormal * directionalLightShadows[0].shadowNormalBias, 0.0);
  vDirectionalShadowCoord[0] = directionalShadowMatrix[0] * shadowPosition;
#endif
