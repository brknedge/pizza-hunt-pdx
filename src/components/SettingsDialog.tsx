import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@/types/pizza";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: User;
  onUpdate: (u: User) => void;
  onClear: () => void;
}

export const SettingsDialog = ({ open, onOpenChange, user, onUpdate, onClear }: Props) => {
  const [name, setName] = useState(user.nickname);
  const [confirm, setConfirm] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setConfirm(false); }}>
      <DialogContent className="max-w-sm bg-card border-2 border-ink shadow-zine-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl tracking-wide">SETTINGS</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="font-display text-lg tracking-wide block mb-1">Your name</label>
            <Input
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              className="border-2 border-ink shadow-zine-sm h-11 rounded-lg"
            />
            <Button
              onClick={() => {
                const trimmed = name.trim();
                if (trimmed) {
                  onUpdate({ ...user, nickname: trimmed });
                  onOpenChange(false);
                }
              }}
              className="mt-2 w-full bg-marinara text-primary-foreground border-2 border-ink shadow-zine-sm font-display tracking-wider rounded-lg"
            >
              SAVE NAME
            </Button>
          </div>

          <div className="border-t-2 border-dashed border-muted pt-4">
            {!confirm ? (
              <Button
                variant="outline"
                onClick={() => setConfirm(true)}
                className="w-full border-2 border-ink text-destructive shadow-zine-sm rounded-lg"
              >
                Clear all my data
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-center">This wipes your nickname and all visits. Sure?</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setConfirm(false)} className="flex-1 border-2 border-ink rounded-lg">
                    Cancel
                  </Button>
                  <Button onClick={onClear} className="flex-1 bg-destructive text-destructive-foreground border-2 border-ink rounded-lg">
                    Yes, clear it
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            PDX Pizza Week 2026 Tracker · v1.0
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
