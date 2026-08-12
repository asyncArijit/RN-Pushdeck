'use client';

import { useState, FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateToken } from '@/lib/hooks/use-tokens';
import { ApiError } from '@/lib/api';

export function CreateTokenDialog({ onCreated }: { onCreated: (rawToken: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const mutation = useCreateToken();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const res = await mutation.mutateAsync(trimmed);
      setName('');
      setOpen(false);
      onCreated(res.rawToken);
    } catch (err) {
      toast.error('Could not create token', {
        description:
          err instanceof ApiError ? `(${err.status})` : err instanceof Error ? err.message : '',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button {...props}>
            <Plus className="size-4" />
            New token
          </Button>
        )}
      />
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Create an API token</DialogTitle>
            <DialogDescription>
              Tokens authenticate the CLI. Give it a memorable name so you can revoke the right
              one later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="name">Token name</Label>
            <Input
              id="name"
              autoFocus
              placeholder="My laptop CLI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? 'Creating…' : 'Create token'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
