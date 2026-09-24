export function smoothAngle(current,target,dt,rate=16){
  return current+Math.atan2(Math.sin(target-current),Math.cos(target-current))*(1-Math.exp(-rate*dt));
}
export class HoldCamera {
  constructor(){this.held=false;}
  press(){this.held=true;}
  release(){this.held=false;}
  update(focus,position,dt){
    if(!this.held)return false;
    focus.lerp(position,1-Math.exp(-24*dt));
    return true;
  }
}
