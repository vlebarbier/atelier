import { Lightbulb } from '@phosphor-icons/react';
import { Page, PageHeader, PageSection } from '../components/ui';
import './settings-help.css';

/**
 * Page Aide (v1) : demarrage rapide en 3 etapes, raccourcis clavier et FAQ.
 * Contenu volontairement court : le but est d'orienter vers les bons gestes
 * (Integrations pour le branchement MCP, Parametres pour l'etat du systeme).
 */

const RACCOURCIS: { touches: string; description: string }[] = [
  {
    touches: 'Cmd K',
    description: 'Ouvrir ou fermer la palette de commandes (Ctrl K sur Windows et Linux).'
  },
  {
    touches: 'Echap',
    description: 'Fermer la palette de commandes.'
  },
  {
    touches: 'Gauche / Droite',
    description: 'Naviguer entre les slides d\'un contenu ouvert (carrousel, document).'
  }
];

const FAQ: { question: string; reponses: string[] }[] = [
  {
    question: 'Pourquoi l\'agent ne répond pas dans le chat ?',
    reponses: [
      'Le chat ne fonctionne que si votre agent est connecte a Atelier (MCP ou API). Ouvrez la page Integrations et verifiez que la configuration est en place ; la page Parametres affiche l\'etat du systeme.',
      'L\'agent est un acteur externe (Hermes, Claude Code, Codex) : il ne tourne pas en continu. Envoyez votre message, puis lancez votre agent de votre cote : il lira la conversation (lire_brouillon) et repondra.',
      'Les reponses apparaissent toutes les 8 secondes (rafraichissement automatique du chat). Si rien n\'apparait, verifiez que le serveur MCP est demarre et que l\'API repond (bouton Tester dans Parametres).'
    ]
  },
  {
    question: 'Comment brancher mon agent sur Atelier ?',
    reponses: [
      'Ouvrez la page Integrations : copiez la configuration MCP correspondant a votre agent (Hermes, Claude Code ou Codex), collez-la dans sa configuration, puis redemarrez l\'agent. Une fois connecte, il peut lire vos brouillons, consulter la charte, piocher dans la bibliotheque et repondre dans le chat.'
    ]
  },
  {
    question: 'Comment publier un contenu ?',
    reponses: [
      'Passez le contenu en statut valide, puis utilisez le bouton Envoyer vers Postiz dans le panneau de revision. La publication reste un acte humain dans Postiz : Atelier ne cree qu\'un brouillon.'
    ]
  }
];

export function HelpPage() {
  return (
    <Page>
      <PageHeader
        title="Aide"
        sub="Demarrage rapide, raccourcis clavier et reponses aux questions frequentes."
      />

      <PageSection label="Démarrage rapide">
        <ol className="help-steps">
          <li>
            <span className="help-step-num">1</span>
            <div>
              <strong>Connectez votre agent</strong>
              <p>
                Ouvrez la page Integrations, copiez la configuration MCP dans votre agent (Hermes,
                Claude Code, Codex) et redemarrez-le. Verifiez l'etat du systeme dans Parametres.
              </p>
            </div>
          </li>
          <li>
            <span className="help-step-num">2</span>
            <div>
              <strong>Deposez ou creez un contenu</strong>
              <p>
                Lancez une nouvelle creation depuis la page Contenus, ou deposez un brouillon produit
                par votre agent. La Bibliotheque fournit les elements de marque, la Charte graphique
                l'identite.
              </p>
            </div>
          </li>
          <li>
            <span className="help-step-num">3</span>
            <div>
              <strong>Revisez, validez, programmez</strong>
              <p>
                Discutez avec l'agent dans le panneau, ajustez les legendes par reseau, passez le
                contenu en valide puis programmez-le dans le calendrier.
              </p>
            </div>
          </li>
        </ol>
      </PageSection>

      <PageSection label="Raccourcis clavier">
        {RACCOURCIS.map((r) => (
          <div className="shortcut-row" key={r.touches}>
            <span className="help-kbd">{r.touches}</span>
            <span>{r.description}</span>
          </div>
        ))}
      </PageSection>

      <PageSection label="FAQ">
        {FAQ.map((f) => (
          <div className="faq-item" key={f.question}>
            <strong>{f.question}</strong>
            {f.reponses.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ))}
      </PageSection>

      <p className="help-footer">
        <Lightbulb size={13} /> Une question sans reponse ici ? Ouvrez la palette (Cmd K) et cherchez
        une page, ou demandez a votre agent dans le chat d'un contenu.
      </p>
    </Page>
  );
}
