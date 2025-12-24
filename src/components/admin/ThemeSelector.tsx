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
    primary: string;
    accent: string;
    preview: string;
}

const themes: Theme[] = [
    {
        id: 'gold-dark',
        name: 'Ouro Escuro',
        primary: '#C9A227',
        accent: '#E4B84A',
        preview: 'from-yellow-600 to-amber-400'
    },
    {
        id: 'rose-dark',
        name: 'Rosé Premium',
        primary: '#E4A0B7',
        accent: '#F5C6D6',
        preview: 'from-pink-400 to-rose-300'
    },
    {
        id: 'emerald-dark',
        name: 'Esmeralda',
        primary: '#10B981',
        accent: '#34D399',
        preview: 'from-emerald-500 to-green-400'
    },
    {
        id: 'purple-dark',
        name: 'Violeta Royal',
        primary: '#8B5CF6',
        accent: '#A78BFA',
        preview: 'from-purple-500 to-violet-400'
    },
    {
        id: 'blue-dark',
        name: 'Azul Safira',
        primary: '#3B82F6',
        accent: '#60A5FA',
        preview: 'from-blue-500 to-cyan-400'
    },
    {
        id: 'coral-dark',
        name: 'Coral Sunset',
        primary: '#F97316',
        accent: '#FB923C',
        preview: 'from-orange-500 to-amber-400'
    },
];

export const ThemeSelector = () => {
    const [currentTheme, setCurrentTheme] = useState('gold-dark');
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('syshair-theme');
        if (savedTheme) {
            setCurrentTheme(savedTheme);
            applyTheme(savedTheme);
        }
    }, []);

    const applyTheme = (themeId: string) => {
        const theme = themes.find(t => t.id === themeId);
        if (theme) {
            document.documentElement.style.setProperty('--primary-color', theme.primary);
            // Could expand this to change more CSS variables
        }
    };

    const selectTheme = (themeId: string) => {
        setCurrentTheme(themeId);
        localStorage.setItem('syshair-theme', themeId);
        applyTheme(themeId);
    };

    const toggleDarkMode = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('light');
    };

    const selectedTheme = themes.find(t => t.id === currentTheme);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Palette size={20} />
                    <span
                        className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-card"
                        style={{ backgroundColor: selectedTheme?.primary }}
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
                                onClick={() => {
                                    if (!isDark) toggleDarkMode();
                                }}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Moon size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    if (isDark) toggleDarkMode();
                                }}
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
