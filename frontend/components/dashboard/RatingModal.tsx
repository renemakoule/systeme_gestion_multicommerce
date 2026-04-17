"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Heart, X, MessageSquare, Send } from "lucide-react";
import { API_URL } from "@/lib/config";

interface RatingModalProps {
  companyId: number;
  initialRating?: number;
  onClose: () => void;
}

export function RatingModal({ companyId, initialRating = 0, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/companies/${companyId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: rating }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to submit rating:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="max-w-xs w-full bg-zinc-900 border border-white/10 rounded-[3px] p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Decorative Background */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--primary-accent)]/5 rounded-full blur-2xl" />
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 hover:bg-white/5 rounded-[3px] transition-colors text-zinc-500 hover:text-white z-20"
          >
            <X size={14} />
          </button>

          {!submitted ? (
            <div className="space-y-4 text-center relative z-10">
              <div className="flex justify-center">
                <div className="w-10 h-10 bg-[var(--primary-accent)]/10 rounded-[3px] flex items-center justify-center text-[var(--primary-accent)]">
                  <Heart size={20} className="fill-[var(--primary-accent)]/20" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                  Votre avis compte
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                  Comment évaluez-vous votre<br />expérience avec notre logiciel ?
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="p-0.5 transition-all hover:scale-110"
                  >
                    <Star
                      size={24}
                      className={`transition-colors duration-200 ${
                        star <= (hoveredRating || rating)
                          ? "text-amber-500 fill-amber-500"
                          : "text-zinc-800"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  disabled={rating === 0 || submitting}
                  onClick={handleSubmit}
                  className="w-full h-10 bg-[var(--primary-accent)] text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[3px] shadow-lg shadow-[var(--primary-accent)]/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
                >
                  {submitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Star size={14} />
                    </motion.div>
                  ) : (
                    <>
                      Envoyer ma note <Send size={12} />
                    </>
                  )}
                </button>
                <p className="mt-4 text-[7px] text-zinc-600 font-black uppercase tracking-[0.3em]">
                  Merci de nous aider à nous améliorer
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-3 py-4 relative z-10"
            >
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-[3px] flex items-center justify-center text-emerald-500">
                  <Heart size={24} className="fill-emerald-500/20" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  Merci infiniment !
                </h3>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                  Votre retour a été enregistré.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
