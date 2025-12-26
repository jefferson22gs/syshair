import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Palette,
    Check,
    Sun,
    Moon,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Theme {
    id: string;
    name: string;
    primary: string;     // HSL values: "H S% L%"
    accent: string;      // HSL values
    primaryHex: string;  // For preview
    preview: string;
}

const themes: Theme[] = [
    {
        id: 'gold',
        name: 'Ouro Escuro',
        primary: '43 74% 49%',
        accent: '43 74% 65%',
        primaryHex: '#C9A227',
        preview: 'from-yellow-600 to-amber-400'
    },
    {
        id: 'rose',
        name: 'Rosé Premium',
        primary: '335 55% 75%',
        accent: '335 60% 85%',
        primaryHex: '#E4A0B7',
        preview: 'from-pink-400 to-rose-300'
    },
    {
        id: 'emerald',
        name: 'Esmeralda',
        primary: '160 84% 39%',
        accent: '160 72% 52%',
        primaryHex: '#10B981',
        preview: 'from-emerald-500 to-green-400'
    },
    {
        id: 'purple',
        name: 'Violeta Royal',
        primary: '263 70% 66%',
        accent: '263 60% 75%',
        primaryHex: '#8B5CF6',
        preview: 'from-purple-500 to-violet-400'
    },
    {
        id: 'blue',
        name: 'Azul Safira',
        primary: '217 91% 60%',
        accent: '217 80% 70%',
        primaryHex: '#3B82F6',
        preview: 'from-blue-500 to-cyan-400'
    },
    {
        id: 'coral',
        name: 'Coral Sunset',
        primary: '25 95% 53%',
        accent: '30 95% 60%',
        primaryHex: '#F97316',
        preview: 'from-orange-500 to-amber-400'
    },
];

export const ThemeSelector = () => {
    const [currentTheme, setCurrentTheme] = useState('gold');
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('syshair-theme');
        const savedMode = localStorage.getItem('syshair-mode');

        if (savedTheme) {
            setCurrentTheme(savedTheme);
            applyTheme(savedTheme);
        }

        if (savedMode === 'light') {
            setIsDark(false);
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    }, []);

    const applyTheme = (themeId: string) => {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;

        const root = document.documentElement;

        // Apply primary color
        root.style.setProperty('--primary', theme.primary);
        root.style.setProperty('--accent', theme.primary);
        root.style.setProperty('--ring', theme.primary);

        // Apply gold variables (for backwards compatibility)
        root.style.setProperty('--gold', theme.primary);
        root.style.setProperty('--gold-light', theme.accent);

        // Sidebar
        root.style.setProperty('--sidebar-primary', theme.primary);
        root.style.setProperty('--sidebar-ring', theme.primary);

        // Update shadow colors based on primary
        const [h, s, l] = theme.primary.split(' ');
        root.style.setProperty('--shadow-gold', `0 8px 32px -8px hsl(${h} ${s} ${l} / 0.3)`);
        root.style.setProperty('--shadow-glow', `0 0 40px hsl(${h} ${s} ${l} / 0.15)`);

        // Update gradient colors
        root.style.setProperty('--gradient-gold', `linear-gradient(135deg, hsl(${theme.primary}), hsl(${theme.accent}))`);

        console.log('Theme applied:', themeId, theme.primary);
    };

    const selectTheme = (themeId: string) => {
        setCurrentTheme(themeId);
        localStorage.setItem('syshair-theme', themeId);
        applyTheme(themeId);
    };

    const toggleDarkMode = (dark: boolean) => {
        setIsDark(dark);
        localStorage.setItem('syshair-mode', dark ? 'dark' : 'light');

        if (dark) {
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
        }
    };

    const selectedTheme = themes.find(t => t.id === currentTheme);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Palette size={20} />
                    <span
                        className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-card"
                        style={{ backgroundColor: selectedTheme?.primaryHex }}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    Personalizar Tema
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Dark/Light Toggle */}
                <div className="p-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                        <span className="text-sm font-medium">Modo</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => toggleDarkMode(true)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Moon size={16} />
                            </button>
                            <button
                                onClick={() => toggleDarkMode(false)}
                                className={`p-2 rounded-lg transition-colors ${!isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Sun size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Cores do Tema</DropdownMenuLabel>

                {/* Theme Colors Grid */}
                <div className="p-2 grid grid-cols-3 gap-2">
                    {themes.map((theme) => (
                        <motion.button
                            key={theme.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => selectTheme(theme.id)}
                            className={`relative p-3 rounded-xl border-2 transition-colors ${currentTheme === theme.id
                                ? 'border-primary'
                                : 'border-border/50 hover:border-border'
                                }`}
                        >
                            <div
                                className={`w-full h-6 rounded-lg bg-gradient-to-r ${theme.preview}`}
                            />
                            <p className="text-xs mt-1.5 text-center text-muted-foreground truncate">
                                {theme.name}
                            </p>
                            {currentTheme === theme.id && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                                >
                                    <Check size={12} className="text-primary-foreground" />
                                </motion.div>
                            )}
                        </motion.button>
                    ))}
                </div>

                <DropdownMenuSeparator />
                <div className="p-2">
                    <p className="text-xs text-muted-foreground text-center">
                        Tema atual: <span className="text-foreground font-medium">{selectedTheme?.name}</span>
                    </p>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
