import React from "react";
import { X, Check } from "lucide-react";
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
      audio?.bump();
      audio?.speak(`Ti mancano ancora ${item.price - save.starsWallet} stelline! Gioca nelle stanze per raccoglierle!`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/50 backdrop-blur-sm p-3 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-cream border-4 border-amber-300 shadow-2xl overflow-hidden">
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
            <div className="flex items-center gap-1.5 bg-amber-400/30 px-3 py-1 rounded-full border border-amber-500/30 font-display font-bold text-amber-900 text-sm">
              <span>⭐</span>
              <span>{save.starsWallet}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-cream hover:bg-cream/80 text-cocoa shadow-sm transition-transform active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Catalogo articoli */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {COSMETICS.map((item) => {
              const isHat = item.type === "hat";
              const unlockedList = isHat ? save.unlockedHats : save.unlockedPowders;
              const isUnlocked = unlockedList.includes(item.id);
              const isEquipped = isHat
                ? save.equippedHat === item.id
                : save.equippedPowder === item.id;
              const canAfford = save.starsWallet >= item.price;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                    isEquipped
                      ? "bg-amber-100/70 border-amber-500 shadow-md"
                      : isUnlocked
                      ? "bg-white/80 border-amber-200 hover:border-amber-400"
                      : "bg-white/50 border-cocoa/10 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl filter drop-shadow-sm">{item.icon}</span>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-display font-bold text-xs sm:text-sm text-cocoa uppercase leading-tight">
                          {item.name}
                        </span>
                        {isEquipped ? (
                          <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                            ATTIVO
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-cocoa/70 line-clamp-1">{item.description}</p>
                    </div>
                  </div>

                  <div>
                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => buyOrEquip(item)}
                        className={`px-3 py-1.5 rounded-full font-display font-bold text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center gap-1 ${
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
                        disabled={!canAfford}
                        onClick={() => buyOrEquip(item)}
                        className={`px-3 py-1.5 rounded-full font-display font-bold text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center gap-1 ${
                          canAfford
                            ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 hover:brightness-105"
                            : "bg-cocoa/10 text-cocoa/40 cursor-not-allowed"
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
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-display font-bold text-sm uppercase shadow-sm active:scale-95 transition-transform"
          >
            FATTO! TORNA A GIOCARE 🐾
          </button>
        </div>
      </div>
    </div>
  );
}
