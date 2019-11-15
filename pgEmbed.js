"use strict"

var gShaderToy = null;
var gRes = null;

function ShaderToy( parentElement )
{
    if( parentElement==null ) return;

    this.mAudioContext = null;
    this.mCreated = false;
    this.mGLContext = null;
    this.mHttpReq = null;
    this.mEffect = null;
    this.mTo = null;
    this.mTOffset = gTime * 1000;
    this.mCanvas = null;
    this.mFPS = piCreateFPSCounter();
    this.mFpsFrame = 0;
    this.mFpsTo = null;
    this.mIsPaused = gPaused;
    this.mForceFrame = true;
    this.mInfo = null;
    this.mCode = null;

    this.mCanvas = document.getElementById("demogl");
    this.mCanvas.tabIndex = "0";

    var me = this;
    this.mCanvas.width  = 500;
    this.mCanvas.height = 360;

    this.mHttpReq = new XMLHttpRequest();
    this.mTo = getRealTime();
    this.mTf = this.mTOffset;
    this.mFpsTo = this.mTo;
    this.mMouseIsDown = false;
    this.mMouseOriX = 0;
    this.mMouseOriY = 0;
    this.mMousePosX = 0;
    this.mMousePosY = 0;

    // --- rendering context ---------------------

    this.mGLContext = piCreateGlContext( this.mCanvas, false, false, false, false );
    if( this.mGLContext==null )
    {
        var ele = document.getElementById("noWebGL");
        ele.style.visibility = "visible";
        this.mCanvas.style.visibility = "hidden";

        this.mIsPaused = true;
        this.mForceFrame = false;
        return;
    }


    // --- audio context ---------------------

    this.mAudioContext = piCreateAudioContext();

    if( this.mAudioContext==null )
    {
         //alert( "no audio!" );
    }

    // --- vr susbsystem ---------------------

    this.mVR = new WebVR( function(b) {}, this.mCanvas );

    // --- soundcloud ---------------------
    try
    {
        if (typeof SC !== "undefined") 
        {
            SC.client_id = 'b1275b704badf79d972d51aa4b92ea15';
            SC.initialize({
                client_id: SC.client_id
            });
        }
        else
        {
            SC = null;
        }
    }
    catch (e)
    {
        SC = null;
    }

    this.mCanvas.onclick = function(ev)
    {
        var vr = me.mVR.IsSupported();
        if( !vr )
        {
            alert( "WebVR API is not supported in this browser" );
        }
        else
        {
            function playSound() {
                SC.stream('/tracks/641645556').then(function(player){
                    player.setVolume(0.3);
                    player.play();
                    player.on('finish', playSound);
                });
            }
            playSound();

            me.mEffect.EnableVR();
            gShaderToy.startRendering();
        }
    }

    this.mEffect = new Effect( this.mVR, this.mAudioContext, this.mGLContext, this.mCanvas.width, this.mCanvas.height, this.RefreshTexturThumbail, this, gMuted, false );
    this.mCreated = true;

}

ShaderToy.prototype.startRendering = function()
{
    var me = this;

    function renderLoop2()
    {
        if( me.mGLContext==null ) return;

        me.mEffect.RequestAnimationFrame(renderLoop2);

        var time = getRealTime();

        var ltime = me.mTOffset + time - me.mTo;
        var dtime = ltime - me.mTf;
        me.mTf = ltime;
        var newFPS = me.mFPS.Count( time );

        if (!me.mVR.IsPresenting()) return;

        me.mEffect.Paint(ltime/1000.0, dtime/1000.0, me.mFPS.GetFPS(), me.mMouseOriX, me.mMouseOriY, me.mMousePosX, me.mMousePosY, me.mIsPaused );
    }

    renderLoop2();
}

ShaderToy.prototype.resize = function( xres, yres )
{
}

//---------------------------------

ShaderToy.prototype.Stop = function()
{
    this.mIsPaused = true;
    this.mEffect.StopOutputs();
}

ShaderToy.prototype.pauseTime = function()
{
    var time = getRealTime();
    if( !this.mIsPaused )
    {
        this.Stop();
     }
    else
    {
        this.mTOffset = this.mTf;
        this.mTo = time;
        this.mIsPaused = false;
        this.mEffect.ResumeOutputs();
        this.mCanvas.focus(); // put mouse/keyboard focus on canvas
    }
}

ShaderToy.prototype.resetTime = function()
{
    this.mTOffset = 0;
    this.mTo = getRealTime();
    this.mTf = 0;
    this.mFpsTo = this.mTo;
    this.mFpsFrame = 0;
    this.mForceFrame = true;
    this.mEffect.ResetTime();
    this.mCanvas.focus(); // put mouse/keyboard focus on canvas
}


ShaderToy.prototype.PauseInput = function( id )
{
    return this.mEffect.PauseInput( 0, id );
}

ShaderToy.prototype.MuteInput = function( id )
{
    return this.mEffect.MuteInput( 0, id );
}

ShaderToy.prototype.RewindInput = function( id )
{
    this.mEffect.RewindInput( 0, id );
    this.mCanvas.focus(); // put mouse/keyboard focus on canvas
}

ShaderToy.prototype.SetTexture = function( slot, url )
{
    this.mEffect.NewTexture( 0, slot, url );
}

ShaderToy.prototype.RefreshTexturThumbail = function( myself, slot, img, forceFrame, gui, guiID, time )
{
  myself.mForceFrame = forceFrame;
}

ShaderToy.prototype.newScriptJSON = function( jsn )
{
    try
    {
        var res = this.mEffect.newScriptJSON( jsn );
        this.mCode = res.mShader;

        if( res.mFailed==false )
        {
            //this.resetTime();
            this.mForceFrame = true;
        }

        this.mInfo = jsn.info;

        return { mFailed      : false,
                 mDate        : jsn.info.date,
                 mViewed      : jsn.info.viewed,
                 mName        : jsn.info.name,
                 mUserName    : jsn.info.username,
                 mDescription : jsn.info.description,
                 mLikes       : jsn.info.likes,
                 mPublished   : jsn.info.published,
                 mHasLiked    : jsn.info.hasliked,
                 mTags        : jsn.info.tags };

    }
    catch( e )
    {
        return { mFailed:true };
    }
}

function watchInit()
{
      //-- shadertoy --------------------------------------------------------
    var viewerParent = document.getElementById("player");
    gShaderToy = new ShaderToy( viewerParent, null );
    if( !gShaderToy.mCreated )
    {
        if( gInvisIfFail!=null )
        {
          var div = document.createElement("img");
          div.src = gInvisIfFail;
          var root = document.getElementsByTagName( "body" )[0];
          root.replaceChild( div, viewerParent );
        }
        return;
    }

    //-- get info --------------------------------------------------------
    var jsnShader = shaderJSON;
    for (var ii=0; ii<shaderJSON[0].renderpass.length; ii++) {
        for (var jj=0; jj<shaderJSON[0].renderpass[ii].inputs.length; jj++) {
            shaderJSON[0].renderpass[ii].inputs[jj].filepath = shaderJSON[0].renderpass[ii].inputs[jj].filepath.substr(1);
        }
    }

    gRes = gShaderToy.newScriptJSON( jsnShader[0] )
    if( gRes.mFailed )
    {
        gShaderToy.pauseTime();
        gShaderToy.resetTime();
    }
}
