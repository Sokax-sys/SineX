import { forwardRef, useImperativeHandle, useRef } from "react";

const isElectron = typeof window !== "undefined" && !!window.electron;

const PlayerFrame = forwardRef(function PlayerFrame(
  { src, style, onLoad, onError, ...rest },
  ref,
) {
  const innerRef = useRef(null);
  useImperativeHandle(ref, () => innerRef.current, []);

  if (isElectron) {
    const webviewProps = {
      ref: innerRef,
      src,
      partition: "persist:player",
      allowpopups: "false",
      sandbox: "allow-scripts allow-same-origin allow-forms",
      style,
      ...rest,
    };
    // listen for load/fail via addEventListener in the parent effects
    return <webview {...webviewProps} />;
  }

  return (
    <iframe
      ref={innerRef}
      src={src}
      style={style}
      title="player"
      sandbox="allow-scripts allow-same-origin allow-forms"
      allow="autoplay; fullscreen; encrypted-media"
      onLoad={onLoad}
      onError={onError}
      {...rest}
    />
  );
});

export default PlayerFrame;
