namespace AnimeCrossover.Core
{
    /// <summary>
    /// El combate cuenta en frames a 60 FPS. Configura Project Settings → Time →
    /// Fixed Timestep = 0.0166667 para que un paso de FixedUpdate sea un frame.
    /// </summary>
    public static class FrameTime
    {
        public const int FramesPerSecond = 60;
        public const float FrameDuration = 1f / FramesPerSecond;

        public static float ToSeconds(int frames) => frames * FrameDuration;
        public static int ToFrames(float seconds) => UnityEngine.Mathf.CeilToInt(seconds * FramesPerSecond);
    }
}
