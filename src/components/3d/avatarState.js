import { Vector3 } from 'three'

/** Avatar world position/heading, written by <Avatar> each frame and read by <CameraRig>. */
export const avatarState = { position: new Vector3(), yaw: 0 }
