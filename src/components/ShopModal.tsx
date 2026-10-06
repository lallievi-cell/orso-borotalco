import React, { useState } from "react";
import { X, Check, Gift } from "lucide-react";
import { COSMETICS, type CosmeticItem } from "@/game/hub/cosmetics";
import type { SaveData } from "@/game/save";
import type { AudioBus } from "@/game/audio";

type Props = {
  save: SaveData;
  onSaveChange: (next: SaveData) => void;
  onClose: () => void;
  audio: AudioBus | null;
};

export function ShopModal({ save, onSaveChange, onClose, audio }: Props) {
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);

  const buyOrEquip = (item: CosmeticItem) => {
    const isHat = item.type === "hat";
    const unlockedList = isHat ? save.unlockedHats : save.unlockedPowders;
    const isUnlocked = unlockedList.includes(item.id);

    if (isUnlocked) {
      // Già posseduto: equipaggia o togli
      if (isHat) {
        const nextHat = save.equippedHat === item.id ? null : item.id;
        const next = { ...save, equippedHat: nextHat };
        onSaveChange(next);
        audio?.power();
        if (nextHat) audio?.speak(`Hai indossato: ${item.name}!`);
        else audio?.speak("Hai tolto il cappellino.");
      } else {
        const nextPowder = save.equippedPowder === item.id ? null : item.id;
        const next = { ...save, equippedPowder: nextPowder };
        onSaveChange(next);
        audio?.power();
        if (nextPowder) audio?.speak(`Hai scelto: ${item.name}!`);
      }
      return;
    }

    // Acquisto con le stelline
    if (save.starsWallet < item.price) {
      const missing = item.price - save.starsWallet;
      setNotice({ id: item.id, text: `Ti mancano ${missing} ⭐!` });
      setTimeout(() => setNotice((cur) => (cur?.id === item.id ? null : cur)), 2500);
      audio?.bump();
      audio?.speak(`Ti mancano ancora ${missing} stelline! Gioca nelle stanze per raccoglierle!`);
      return;
    }

    const nextWallet = save.starsWallet - item.price;
    const nextUnlockedHats = isHat ? [...save.unlockedHats, item.id] : save.unlockedHats;
    const nextUnlockedPowders = !isHat ? [...save.unlockedPowders, item.id] : save.unlockedPowders;
    const nextEquippedHat = isHat ? item.id : save.equippedHat;
    const nextEquippedPowder = !isHat ? item.id : save.equippedPowder;

    const next: SaveData = {
      ...save,
      starsWallet: nextWallet,
      unlockedHats: nextUnlockedHats,
      unlockedPowders: nextUnlockedPowders,
      equippedHat: nextEquippedHat,
      equippedPowder: nextEquippedPowder,
    };

    onSaveChange(next);
    audio?.win();
    audio?.speak(`Evviva! Hai comprato ${item.name}! Ti sta benissimo!`);
  };

  const claimWelcomeGift = () => {
    const next: SaveData = {
      ...save,
      starsWallet: save.starsWallet + 25,
    };
    onSaveChange(next);
    audio?.win();
    audio?.speak("Evviva! Ecco 25 stelline in regalo per te da Babbo Coniglio! Scegli il tuo primo vestitino!");
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-cocoa/50 backdrop-blur-sm p-3 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          audio?.power();
          onClose();
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-cream border-4 border-amber-300 shadow-2xl overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Intestazione */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 border-b-2 border-amber-300">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🛍️</span>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold uppercase text-cocoa leading-none">
                IL BAZAR DELLE STELLINE
              </h2>
              <span className="text-xs font-bold text-cocoa/70">Scegli i tuoi vestitini magici!</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-400/40 px-3 py-1 rounded-full border border-amber-500/40 font-display font-bold text-amber-950 text-sm shadow-sm">
              <span>⭐</span>
              <span>{save.starsWallet}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                audio?.power();
                onClose();
              }}
              className="grid h-8 w-8 place-items-center rounded-full bg-cream hover:bg-cream/80 text-cocoa shadow-sm transition-transform active:scale-95 cursor-pointer"
              aria-label="Chiudi bazar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Catalogo articoli */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Regalo di benvenuto se hai 0 stelline e nessun vestitino sbloccato */}
          {save.starsWallet === 0 && save.unlockedHats.length === 0 ? (
            <div className="bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200 border-2 border-amber-400/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">🎁</span>
                <div>
                  <div className="font-display font-bold text-xs sm:text-sm text-amber-950 uppercase">
                    REGALO DI BENVENUTO DA BABBO CONIGLIO!
                  </div>
                  <p className="text-[11px] font-bold text-amber-900/80">
                    Ritira subito 25 Stelline magiche per provare il tuo primo vestitino!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={claimWelcomeGift}
                className="px-3.5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-xs uppercase shadow-md active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>⭐</span>
                <span>RITIRA +25</span>
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {COSMETICS.map((item) => {
              const isHat = item.type === "hat";
              const unlockedList = isHat ? save.unlockedHats : save.unlockedPowders;
              const isUnlocked = unlockedList.includes(item.id);
              const isEquipped = isHat
                ? save.equippedHat === item.id
                : save.equippedPowder === item.id;
              const canAfford = save.starsWallet >= item.price;
              const itemNotice = notice?.id === item.id ? notice.text : null;

              return (
                <div
                  key={item.id}
                  onClick={() => buyOrEquip(item)}
                  className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    isEquipped
                      ? "bg-amber-100/80 border-amber-500 shadow-md ring-2 ring-amber-400/40"
                      : isUnlocked
                      ? "bg-white border-amber-200 hover:border-amber-400 shadow-sm"
                      : "bg-white/70 border-cocoa/10 hover:border-amber-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-3xl filter drop-shadow-sm shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-xs sm:text-sm text-cocoa uppercase leading-tight truncate">
                          {item.name}
                        </span>
                        {isEquipped ? (
                          <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0">
                            ATTIVO
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-cocoa/70 line-clamp-1">{item.description}</p>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {itemNotice ? (
                      <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full animate-bounce">
                        {itemNotice}
                      </span>
                    ) : null}
                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          buyOrEquip(item);
                        }}
                        className={`px-3 py-1.5 rounded-full font-display font-bold text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer ${
                          isEquipped
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-emerald-500 text-white hover:bg-emerald-600"
                        }`}
                      >
                        {isEquipped ? "TOGLI" : "INDOSSA"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          buyOrEquip(item);
                        }}
                        className={`px-3 py-1.5 rounded-full font-display font-bold text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer ${
                          canAfford
                            ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 hover:brightness-105 shadow-md"
                            : "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                        }`}
                      >
                        <span>⭐</span>
                        <span>{item.price}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chiusura / Ritorna al gioco */}
        <div className="p-3 bg-amber-50 border-t border-amber-200 flex justify-center">
          <button
            type="button"
            onClick={() => {
              audio?.power();
              onClose();
            }}
            className="px-6 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-display font-bold text-sm uppercase shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            FATTO! TORNA A GIOCARE 🐾
          </button>
        </div>
      </div>
    </div>
  );
}
