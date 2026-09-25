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

// Screen axes for the camera at (+X,+Z): right=(+X,-Z), down=(+X,+Z).
export class EdgeCamera {
  constructor(){this.clear();this.margin=32;this.speed=18;this.bound=20;}
  clear(){this.pointer=null;}
  move(x,y){this.pointer={x,y};}
  update(focus,dt,width,height,locked=false,zoom=1){
    if(locked||!this.pointer||dt<=0||width<=0||height<=0)return false;
    const {x,y}=this.pointer;
    if(x<0||y<0||x>=width||y>=height)return false;
    const axis=(p,size)=>p<this.margin?-(1-p/this.margin):p>size-this.margin?1-(size-p)/this.margin:0;
    let dx=axis(x,width),dy=axis(y,height);
    const length=Math.hypot(dx,dy);if(!length)return false;
    if(length>1){dx/=length;dy/=length;}
    const step=this.speed*dt*zoom/Math.sqrt(2),oldX=focus.x,oldZ=focus.z;
    focus.x=Math.max(-this.bound,Math.min(this.bound,focus.x+(dx+dy)*step));
    focus.z=Math.max(-this.bound,Math.min(this.bound,focus.z+(dy-dx)*step));
    return focus.x!==oldX||focus.z!==oldZ;
  }
}
