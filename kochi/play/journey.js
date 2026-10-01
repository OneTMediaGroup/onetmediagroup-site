/** A cloud journey replaces progression, not an unfinished local match.
 * The caller validates the cloud payload and saves the old browser journey first.
 */
export function restoredCloudSave(current,progress,revision,id=()=>crypto.randomUUID()) {
 return {schemaVersion:1,progress:structuredClone(progress),cloudRevision:revision,
  matchID:id(),moves:[],opponent:null,guardian:false,started:false,
  name:current.name,sound:current.sound};
}
