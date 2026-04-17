"use client";

import React, { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 120, className }) => {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    if (value) {
      QRCodeLib.toString(value, { type: "svg", margin: 2, width: size }, (err, string) => {
        if (!err) {
          setSvg(string);
        } else {
          console.error("QR Code generation error:", err);
        }
      });
    }
  }, [value, size]);

  if (!svg) return null;

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ width: size, height: size, margin: "0 auto" }}
    />
  );
};
