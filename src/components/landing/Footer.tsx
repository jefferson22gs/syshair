import { Logo } from "@/components/icons/Logo";
import { Instagram, MessageCircle, ExternalLink, Heart } from "lucide-react";
import { DEVELOPER_INFO, getSupportWhatsAppLink } from "@/config/contact";

const footerLinks = {
  produto: [
    { label: "Funcionalidades", href: "#features" },
    { label: "Preços", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Demonstração", href: "#video" },
  ],
  empresa: [
    { label: "Sobre nós", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contato", href: getSupportWhatsAppLink('support') },
  ],
  recursos: [
    { label: "Central de ajuda", href: getSupportWhatsAppLink('support') },
    { label: "WhatsApp Suporte", href: getSupportWhatsAppLink('support') },
    { label: "Instagram", href: DEVELOPER_INFO.instagramLink },
  ],
  legal: [
    { label: "Termos de uso", href: "#" },
    { label: "Privacidade", href: "#" },
    { label: "Cookies", href: "#" },
  ],
};

const socialLinks = [
  { icon: Instagram, href: DEVELOPER_INFO.instagramLink, label: "Instagram" },
  { icon: MessageCircle, href: DEVELOPER_INFO.whatsappLink, label: "WhatsApp" },
];

export const Footer = () => {
  return (
    <footer className="py-16 border-t border-border">
      <div className="container px-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="col-span-2">
            <Logo className="mb-4" />
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              O sistema mais completo para gestão de barbearias e salões de beleza do Brasil.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Produto</h4>
            <ul className="space-y-3">
              {footerLinks.produto.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Suporte</h4>
            <ul className="space-y-3">
              {footerLinks.recursos.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {link.label}
                    <ExternalLink size={12} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Developer Credit */}
        <div className="py-6 border-t border-border mb-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              Desenvolvido por{" "}
              <a
                href={DEVELOPER_INFO.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                {DEVELOPER_INFO.company}
              </a>
            </p>
            <div className="flex items-center gap-3">
              <a
                href={DEVELOPER_INFO.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors text-sm"
              >
                <MessageCircle size={14} />
                {DEVELOPER_INFO.whatsappFormatted}
              </a>
              <a
                href={DEVELOPER_INFO.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 transition-colors text-sm"
              >
                <Instagram size={14} />
                {DEVELOPER_INFO.instagram}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 SysHair BelezaTech. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Feito com <Heart size={14} className="text-red-500 fill-red-500" /> por{" "}
            <a
              href={DEVELOPER_INFO.instagramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {DEVELOPER_INFO.company}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
