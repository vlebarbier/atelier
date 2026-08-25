/**
 * Notification webhook fire-and-forget vers l'agent Hermes (worker chat Atelier).
 *
 * Quand un message `user` est posté dans la conversation d'un brouillon,
 * on prévient l'agent pour qu'il réponde sans polling. Signature HMAC-SHA256
 * V2 (timestamp.body) attendue par le gateway Hermes.
 *
 * Config (env Vercel) :
 *   ATELIER_HOOK_URL    — ex. https://<machine>.ts.net/webhooks/atelier-worker
 *   ATELIER_HOOK_SECRET — secret partagé (jamais en dur dans le code)
 *
 * Jamais bloquant : un échec de notification n'échoue pas la requête API
 * (le cron de secours côté agent rattrape sinon).
 */
import { createHmac } from 'node:crypto';

export function notifierAgent(
  payload: Record<string, unknown>
): void {
  const url = process.env.ATELIER_HOOK_URL;
  const secret = process.env.ATELIER_HOOK_SECRET;
  if (!url || !secret) return; // non configuré = no-op silencieux

  const body = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac('sha256', secret)
    .update(`${ts}.${body}`)
    .digest('hex');

  // Fire-and-forget volontaire : aucune attente, aucune propagation d'erreur.
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature-V2': sig,
      'X-Webhook-Timestamp': ts
    },
    body
  }).catch(() => {});
}
