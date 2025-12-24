import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    salonName: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.name,
      formData.phone
    );

    if (!error) {
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const benefits = [
    "7 dias grátis para testar",
    "Sem cartão de crédito",
    "Suporte completo",
    "Cancele quando quiser",
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar ao início
          </Link>

          {/* Logo */}
          <div className="mb-8">
            <Logo size="lg" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Crie sua conta grátis
            </h1>
            <p className="text-muted-foreground">
              Comece a transformar seu salão agora mesmo
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="salonName">Nome do Salão</Label>
              <Input
                id="salonName"
                name="salonName"
                type="text"
                placeholder="Ex: Barbearia Premium"
                value={formData.salonName}
                onChange={handleChange}
                className="h-12"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Como podemos te chamar?"
                value={formData.name}
                onChange={handleChange}
                className="h-12"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                className="h-12"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={handleChange}
                className="h-12"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  className="h-12 pr-12"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Criando conta...
                </>
              ) : (
                'Criar minha conta grátis'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ao criar sua conta, você concorda com nossos{" "}
              <a href="#" className="text-primary hover:underline">Termos de Uso</a> e{" "}
              <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
            </p>
          </form>

          {/* Sign In Link */}
          <p className="text-center mt-8 text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex flex-1 relative bg-surface-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-md px-8">
          <h2 className="font-display text-3xl font-bold text-foreground mb-8">
            Por que escolher o{" "}
            <span className="text-gradient-gold">SysHair?</span>
          </h2>

          <ul className="space-y-6">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Check size={16} className="text-primary" />
                </div>
                <span className="text-lg text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 p-6 rounded-2xl glass-card">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-gold-light flex items-center justify-center text-primary-foreground font-bold">
                RS
              </div>
              <div>
                <p className="font-semibold text-foreground">Roberto Silva</p>
                <p className="text-sm text-muted-foreground">Barbearia Vintage</p>
              </div>
            </div>
            <p className="text-muted-foreground italic">
              "O SysHair transformou minha barbearia. Reduzi 70% das faltas e meus clientes adoram a facilidade de agendar."
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default Register;
