{
  "product": {
    "name": "RiffNecromancer",
    "design_personality": [
      "Premium Gothic",
      "dark cathedral meets premium audio gear",
      "ritualistic + editorial",
      "ominous-but-elegant",
      "mobile-first (phone on stand while playing)"
    ],
    "non_negotiables": {
      "accent_color": "#DC2626",
      "accent_usage_rule": "Crimson is the SOLE accent. Use sparingly for focus metrics, active states, brand highlights, and critical feedback only.",
      "no_pure_black": "Never use #000000. Use deep charcoals (#0A0A0B, #111114, #15151A).",
      "layout": "Clean negative space; avoid heavy grid borders; add strict bottom padding so content never clips.",
      "accessibility": [
        "Deaf/HoH mode: real-time visual feedback (waveforms, color-shifting tab streams, string vibration animations)",
        "Visually Impaired mode: semantic HTML, ARIA live regions, high-contrast mode, customizable audio cues"
      ],
      "testing": "All interactive and key informational elements MUST include data-testid (kebab-case, role-based).",
      "js_only": "Project uses .js/.jsx (not .tsx). Provide examples accordingly."
    }
  },

  "inspiration_refs": {
    "search_notes": [
      "Fuse: dark glassmorphism dashboards + premium audio hardware UI (LED glow, meters) + gothic editorial typography.",
      "Waveform/tuner UI patterns: oscilloscope center stage, deviation dot, cents readout, subtle grid.",
      "Avoid neon cyberpunk; keep glow restrained and luxurious."
    ],
    "urls": [
      {
        "label": "NN/g Glassmorphism (contrast cautions)",
        "url": "https://www.nngroup.com/articles/glassmorphism/"
      },
      {
        "label": "SPL Crimson product (audio hardware inspiration)",
        "url": "https://spl.audio/en/spl-produkt/crimson-3/"
      },
      {
        "label": "Soundbrenner tuner (interaction reference)",
        "url": "https://tuner.soundbrenner.com"
      }
    ]
  },

  "design_tokens": {
    "css_custom_properties": {
      "placement": "Define in /app/frontend/src/index.css under @layer base :root and .dark. App should run in dark mode by default.",
      "colors_hsl": {
        "background": "240 6% 4%",
        "foreground": "0 0% 96%",

        "card": "240 6% 7%",
        "card-foreground": "0 0% 96%",

        "popover": "240 6% 6%",
        "popover-foreground": "0 0% 96%",

        "primary": "0 0% 96%",
        "primary-foreground": "240 6% 8%",

        "secondary": "240 5% 12%",
        "secondary-foreground": "0 0% 96%",

        "muted": "240 5% 10%",
        "muted-foreground": "240 5% 65%",

        "accent": "240 5% 12%",
        "accent-foreground": "0 0% 96%",

        "destructive": "0 72% 45%",
        "destructive-foreground": "0 0% 98%",

        "border": "240 5% 16%",
        "input": "240 5% 16%",
        "ring": "0 72% 52%",

        "brand": "0 72% 52%",
        "brand-foreground": "0 0% 98%",
        "brand-muted": "0 72% 52% / 0.18",
        "brand-glow": "0 72% 52% / 0.35",

        "surface-1": "240 6% 6%",
        "surface-2": "240 6% 9%",
        "surface-3": "240 5% 12%",

        "text-1": "0 0% 96%",
        "text-2": "240 5% 72%",
        "text-3": "240 4% 58%",

        "focus": "0 72% 52%",
        "success": "142 55% 45%",
        "warning": "38 92% 50%",
        "info": "210 90% 55%"
      },
      "radius": {
        "radius": "0.9rem",
        "radius-sm": "0.65rem",
        "radius-lg": "1.1rem"
      },
      "shadows": {
        "shadow-elev-1": "0 10px 30px rgba(0,0,0,0.55)",
        "shadow-elev-2": "0 18px 60px rgba(0,0,0,0.65)",
        "shadow-inner-marble": "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.55)",
        "shadow-crimson-glow": "0 0 0 1px rgba(220,38,38,0.22), 0 0 24px rgba(220,38,38,0.14)"
      },
      "spacing": {
        "page_padding_x": "px-4 sm:px-6",
        "page_padding_y": "py-6",
        "page_bottom_safe": "pb-24 sm:pb-16 (strict; prevents clipping behind bottom nav / charts)"
      }
    },

    "tailwind_extensions": {
      "note": "Prefer CSS variables + Tailwind arbitrary values for glow and marble surfaces.",
      "recommended_utility_patterns": [
        "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
        "bg-[hsl(var(--card))]/80 backdrop-blur-md",
        "ring-1 ring-[hsl(var(--border))]",
        "shadow-[var(--shadow-elev-1)]",
        "[box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
      ]
    }
  },

  "typography": {
    "fonts": {
      "headers": {
        "family": "Cinzel",
        "usage": "STRICTLY for primary headers and section titles only (e.g., Progress Altar, Tone Lab, Ritual).",
        "css": "font-[\"Cinzel\"] (via CSS variable or Tailwind font-family extension)"
      },
      "ui": {
        "family": "Space Grotesk",
        "fallbacks": "Inter, system-ui",
        "usage": "All labels, navigation, numbers, readouts, forms, tables. Razor-thin editorial contrast against Cinzel."
      },
      "numbers_optional": {
        "family": "Space Grotesk (default)",
        "note": "Avoid monospace unless needed for tab alignment; keep premium editorial feel."
      }
    },
    "scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "section_title": "text-xl sm:text-2xl tracking-[0.08em] uppercase (Cinzel)",
      "body": "text-sm sm:text-base",
      "small": "text-xs text-[hsl(var(--text-3))]"
    },
    "type_rules": [
      "Use slightly increased letter-spacing for Cinzel titles: tracking-[0.08em] to feel engraved.",
      "Keep line-height generous on dark backgrounds: leading-6/7.",
      "Numbers should ‘float’: use tabular-nums only for tables/stats alignment (tabular-nums)."
    ]
  },

  "layout_system": {
    "grid": {
      "app_shell": "Mobile-first. Use a top app bar + optional bottom nav (Sheet/NavigationMenu) for quick switching while playing.",
      "max_width": "max-w-6xl for dashboards; max-w-2xl for auth/onboarding; tuner is full-bleed.",
      "spacing": "Use 2–3x more spacing than feels comfortable. Prefer gap-4/6/8.",
      "cards": "Bento-like card layout on dashboard: 1 col mobile, 2 col md, 3 col lg. Avoid visible grid borders; rely on elevation + subtle ring."
    },
    "safe_areas": {
      "rule": "Every page container must include pb-24 (mobile) to prevent clipping of legends/meters at bottom.",
      "sticky_controls": "If Drill Player has sticky transport controls, add bottom padding equal to control height + 16px."
    }
  },

  "component_system": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_components": [
        "button.jsx",
        "card.jsx",
        "tabs.jsx",
        "slider.jsx",
        "switch.jsx",
        "dialog.jsx",
        "drawer.jsx",
        "sheet.jsx",
        "calendar.jsx",
        "badge.jsx",
        "progress.jsx",
        "tooltip.jsx",
        "sonner.jsx",
        "input.jsx",
        "label.jsx",
        "select.jsx",
        "separator.jsx",
        "scroll-area.jsx"
      ]
    },

    "buttons": {
      "style": "Luxury / Elegant (rounded 10–12px, subtle elevation, crimson glow only on focus/active)",
      "variants": {
        "primary": {
          "use": "Primary CTA (Subscribe, Start Drill, Complete Ritual)",
          "classes": "bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] shadow-[var(--shadow-crimson-glow)] hover:bg-[hsl(var(--brand))]/90 active:bg-[hsl(var(--brand))]/85",
          "motion": "transition-colors duration-200 (NO transition-all) + active:scale-[0.99]"
        },
        "secondary": {
          "use": "Secondary actions (Preview, Save Preset)",
          "classes": "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] ring-1 ring-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]/80",
          "motion": "transition-colors duration-200"
        },
        "ghost": {
          "use": "Toolbar icons, subtle actions",
          "classes": "bg-transparent text-[hsl(var(--text-2))] hover:bg-[hsl(var(--accent))]/60 hover:text-[hsl(var(--foreground))]",
          "motion": "transition-colors duration-200"
        },
        "destructive": {
          "use": "Danger actions (Delete account)",
          "classes": "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90",
          "motion": "transition-colors duration-200"
        }
      },
      "data_testid_examples": [
        "data-testid=\"subscribe-monthly-button\"",
        "data-testid=\"drill-player-complete-button\"",
        "data-testid=\"tone-lab-save-preset-button\""
      ]
    },

    "cards": {
      "base": {
        "classes": "bg-[hsl(var(--card))]/75 backdrop-blur-md ring-1 ring-[hsl(var(--border))] rounded-[var(--radius)] [box-shadow:var(--shadow-inner-marble),var(--shadow-elev-1)]",
        "header": "Use Cinzel for card titles only; keep body in Space Grotesk.",
        "hover": "hover:ring-[hsl(var(--border))]/80 hover:bg-[hsl(var(--card))]/85 transition-colors duration-200"
      },
      "premium_locked": {
        "pattern": "Overlay a subtle diagonal noise + lock badge; do NOT dim text too much (accessibility).",
        "classes": "relative overflow-hidden",
        "badge": "Use <Badge> with bg-[hsl(var(--brand))]/15 text-[hsl(var(--brand))] ring-1 ring-[hsl(var(--brand))]/30",
        "icon": "Use lucide-react Lock icon (no emoji)."
      }
    },

    "tabs": {
      "style": "Ritual switches: pill-ish tabs with engraved feel.",
      "classes": {
        "list": "bg-[hsl(var(--secondary))]/60 ring-1 ring-[hsl(var(--border))] rounded-[calc(var(--radius)+6px)] p-1",
        "trigger": "data-[state=active]:bg-[hsl(var(--card))]/90 data-[state=active]:text-[hsl(var(--foreground))] data-[state=active]:shadow-[var(--shadow-crimson-glow)] text-[hsl(var(--text-2))] rounded-[calc(var(--radius)+4px)] transition-colors duration-200"
      },
      "data_testid": [
        "data-testid=\"tone-lab-genre-tabs\"",
        "data-testid=\"dashboard-mode-tabs\""
      ]
    },

    "forms_auth": {
      "inputs": {
        "classes": "bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus))]",
        "labels": "text-xs uppercase tracking-wider text-[hsl(var(--text-3))]"
      },
      "google_oauth_button": {
        "style": "Secondary button with icon left; keep crimson only for focus ring.",
        "data_testid": "data-testid=\"google-oauth-button\""
      }
    },

    "slider_tone_lab": {
      "use": "shadcn Slider",
      "visual": {
        "track": "bg-[hsl(var(--secondary))]",
        "range": "bg-[hsl(var(--brand))]/70",
        "thumb": "bg-[hsl(var(--card))] ring-1 ring-[hsl(var(--brand))]/40 shadow-[var(--shadow-crimson-glow)]"
      },
      "labels": "Left label (Gain), right value (0–10) using tabular-nums.",
      "data_testid_examples": [
        "data-testid=\"tone-lab-gain-slider\"",
        "data-testid=\"tone-lab-presence-slider\""
      ]
    },

    "calendar_history": {
      "use": "shadcn Calendar",
      "layout_fix": {
        "problem": "Month header (PREV / JUNE 2026 / NEXT) collides on narrow viewports.",
        "solution": [
          "Wrap header in a 3-column grid with min widths and truncation:",
          "- Left: prev button (w-12)",
          "- Center: month label (min-w-0, text-center, truncate)",
          "- Right: next button (w-12)",
          "Add px-2 and ensure buttons are icon-only on xs.",
          "If still tight: move PREV/NEXT labels to sr-only and show chevrons only."
        ],
        "example_classes": {
          "header": "grid grid-cols-[48px,1fr,48px] items-center gap-2 px-2",
          "month_label": "min-w-0 text-center font-[\"Cinzel\"] tracking-[0.12em] uppercase text-sm truncate",
          "nav_button": "h-10 w-12 rounded-[calc(var(--radius)+4px)] bg-[hsl(var(--secondary))]/60 ring-1 ring-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]/80 transition-colors duration-200"
        }
      },
      "day_cells": {
        "rule": "No heavy borders. Use subtle hover surface + crimson dot for sessions.",
        "session_indicator": "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[hsl(var(--brand))]"
      },
      "stats_blocks": {
        "layout": "Above calendar: 2x2 stat blocks on mobile, 4 across on md.",
        "classes": "grid grid-cols-2 gap-3 md:grid-cols-4",
        "stat_card": "bg-[hsl(var(--card))]/70 ring-1 ring-[hsl(var(--border))] rounded-[var(--radius)] p-3 [box-shadow:var(--shadow-inner-marble)]"
      }
    },

    "paywall_pricing": {
      "pricing_toggle": {
        "use": "shadcn Tabs or ToggleGroup",
        "classes": "bg-[hsl(var(--secondary))]/60 ring-1 ring-[hsl(var(--border))] rounded-full p-1",
        "active": "data-[state=on]:bg-[hsl(var(--brand))]/15 data-[state=on]:text-[hsl(var(--foreground))]"
      },
      "paywall_modal": {
        "use": "shadcn Dialog",
        "style": "Dark glass panel with crimson rim only on primary CTA.",
        "classes": "bg-[hsl(var(--popover))]/80 backdrop-blur-xl ring-1 ring-[hsl(var(--border))] [box-shadow:var(--shadow-elev-2)]",
        "data_testid": "data-testid=\"paywall-dialog\""
      }
    },

    "toast": {
      "use": "sonner",
      "style": "Toasts should be dark glass with subtle crimson left border for errors/important events.",
      "data_testid": "data-testid=\"global-toast-region\""
    }
  },

  "feature_specific_ui": {
    "tuner_fullscreen": {
      "layout": "Full-bleed canvas visualizer with a top overlay HUD (note, cents, string). Bottom has large touch targets for string selection.",
      "visual_feedback": {
        "waveform": "Canvas oscilloscope line in crimson with soft glow; when in-tune, line shifts toward off-white and glow reduces.",
        "deviation": "Center needle/dot; left=flat right=sharp. Use crimson only for deviation; neutral for stable.",
        "deaf_hoh_mode": "Amplify visual cues: thicker waveform, stronger glow, larger cents readout, optional vibration animation on string lane.",
        "visually_impaired_mode": "Add ARIA live region announcing note + cents + in-tune status; provide optional audio cue toggles."
      },
      "data_testid": [
        "data-testid=\"tuner-note-readout\"",
        "data-testid=\"tuner-cents-readout\"",
        "data-testid=\"tuner-string-selector\""
      ]
    },

    "drill_player": {
      "tab_stream": {
        "style": "Vertical lane-based stream (6 strings). Active notes glow crimson; inactive notes are muted gray.",
        "color_rule": "Crimson only for current beat/active note + errors. Do not color the entire stream crimson.",
        "micro_interaction": "On beat: subtle pulse (opacity) on active lane; avoid scale transforms on the whole container."
      },
      "palm_mute_visualizer": {
        "style": "Timing bar with ‘tightness’ window; crimson indicates late/early hits.",
        "accessibility": "Provide text summary for screen readers (e.g., ‘3 hits early, 1 late’)."
      },
      "metronome": {
        "style": "Large tap target; pulse ring on beat using box-shadow (not transform-heavy).",
        "data_testid": "data-testid=\"drill-player-metronome\""
      }
    },

    "tone_lab": {
      "signal_chain": {
        "layout": "Horizontal chain of modules (Input → Gain → EQ → Presence → Master → Output). On mobile, use ScrollArea horizontal.",
        "module_card": "Small dark-glass cards with icon + label; active module gets crimson rim glow.",
        "data_testid": "data-testid=\"tone-lab-signal-chain\""
      },
      "presets": {
        "style": "Preset chips using ToggleGroup; active chip gets crimson outline.",
        "test_live_tone": {
          "interaction": "Gesture-trigger button: press-and-hold to audition; release stops. Provide haptic-like visual feedback (expanding glow).",
          "data_testid": "data-testid=\"tone-lab-test-live-tone-button\""
        }
      }
    },

    "progress_altar": {
      "charts": {
        "library": "Recharts (recommended) for timeline + metrics.",
        "style": "No heavy grid lines. Use subtle axis ticks in muted text; highlight current streak in crimson.",
        "empty_state": "Ritual parchment card: ‘No rituals yet’ with a single crimson dot + CTA."
      },
      "data_testid": "data-testid=\"progress-altar-timeline\""
    }
  },

  "motion_microinteractions": {
    "principles": [
      "Static = dead: add micro-animations to hover, press, and state changes.",
      "Respect prefers-reduced-motion.",
      "Never use transition: all. Only transition colors/opacity/shadow.",
      "Use subtle ‘breathing’ glow for active crimson elements (2.8–3.6s)."
    ],
    "recommended_library": {
      "name": "framer-motion",
      "install": "npm i framer-motion",
      "usage": "Use for page transitions (opacity + y), tab stream entrance, modal reveal. Avoid heavy transforms on large canvases."
    },
    "css_keyframes": {
      "crimson_breathe": "@keyframes crimson-breathe { 0%,100% { box-shadow: 0 0 0 1px rgba(220,38,38,0.18), 0 0 18px rgba(220,38,38,0.10);} 50% { box-shadow: 0 0 0 1px rgba(220,38,38,0.28), 0 0 26px rgba(220,38,38,0.16);} }"
    }
  },

  "textures_gradients": {
    "gradient_restriction_rule": {
      "prohibited": [
        "blue-500 to purple-600",
        "purple-500 to pink-500",
        "green-500 to blue-500",
        "red to pink",
        "any dark/saturated gradient combos"
      ],
      "rules": [
        "NEVER let gradients cover more than 20% of the viewport.",
        "NEVER apply gradients to text-heavy content or reading areas.",
        "NEVER use gradients on small UI elements (<100px width).",
        "NEVER stack multiple gradient layers in the same viewport.",
        "IF gradient area exceeds 20% of viewport OR affects readability THEN use solid colors."
      ]
    },
    "allowed_usage": {
      "hero_only": "Use a very subtle charcoal-to-charcoal gradient + noise overlay in hero/top sections only.",
      "recommended_gradients": [
        {
          "name": "Obsidian Veil",
          "css": "background: radial-gradient(1200px circle at 20% 0%, rgba(220,38,38,0.10), transparent 55%), radial-gradient(900px circle at 80% 10%, rgba(255,255,255,0.04), transparent 60%), linear-gradient(180deg, #0A0A0B 0%, #111114 55%, #0A0A0B 100%);"
        }
      ],
      "noise_overlay": {
        "css": "background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"160\" height=\"160\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"160\" height=\"160\" filter=\"url(%23n)\" opacity=\"0.08\"/></svg>');",
        "note": "Use as a pseudo-element overlay on large sections only (hero/background), not on cards."
      }
    }
  },

  "accessibility_spec": {
    "modes": {
      "deaf_hoh": {
        "ui": [
          "Increase visual amplitude: thicker waveform stroke, larger cents/note readouts",
          "Add beat flash ring for metronome",
          "Optional string vibration animation when in tune"
        ],
        "controls": "Expose a toggle in Settings + Onboarding step.",
        "data_testid": "data-testid=\"accessibility-deaf-hoh-toggle\""
      },
      "visually_impaired": {
        "ui": [
          "High-contrast text mode (increase foreground, reduce muted)",
          "Semantic headings order (h1→h2→h3)",
          "ARIA live regions for tuner/drill feedback",
          "Optional audio cues with volume slider"
        ],
        "aria": {
          "live_region": "<div aria-live=\"polite\" aria-atomic=\"true\" className=\"sr-only\" data-testid=\"aria-live-region\" />",
          "labels": "All icon-only buttons must have aria-label."
        },
        "data_testid": "data-testid=\"accessibility-visually-impaired-toggle\""
      }
    },
    "focus": {
      "rule": "Always show visible focus ring (crimson) with ring-offset matching background.",
      "avoid": "Do not rely on color alone; pair crimson with icon/shape changes for status."
    }
  },

  "libraries": {
    "recommended": [
      {
        "name": "recharts",
        "why": "Progress Altar timeline + metrics",
        "install": "npm i recharts",
        "notes": "Use muted axes; highlight key series in crimson only."
      },
      {
        "name": "framer-motion",
        "why": "Micro-interactions + page transitions",
        "install": "npm i framer-motion"
      }
    ],
    "audio_visualization": {
      "note": "Waveform should be Canvas-based for performance. Keep UI overlays in React.",
      "optional": [
        {
          "name": "tone",
          "install": "npm i tone",
          "why": "Metronome timing + audio cues"
        }
      ]
    }
  },

  "image_urls": {
    "status": "MOCKED (image selector tool unavailable in environment)",
    "guidance": [
      {
        "category": "landing_hero_background",
        "description": "Dark marble / obsidian texture, very subtle. Use as low-opacity overlay behind hero only.",
        "suggested_sources": [
          "https://unsplash.com/s/photos/black-marble",
          "https://www.pexels.com/search/black%20marble/"
        ]
      },
      {
        "category": "curriculum_preview",
        "description": "Moody close-up of guitar strings / hands on fretboard (low saturation).",
        "suggested_sources": [
          "https://unsplash.com/s/photos/guitar-strings",
          "https://www.pexels.com/search/guitar%20strings/"
        ]
      },
      {
        "category": "testimonial_avatars",
        "description": "High-contrast musician portraits (cropped circles).",
        "suggested_sources": [
          "https://www.pexels.com/search/portrait%20musician/"
        ]
      }
    ]
  },

  "page_blueprints": {
    "landing": {
      "sections": [
        "Hero: Cinzel title + short value prop + primary CTA + pricing toggle snippet",
        "Curriculum preview: bento cards with locks",
        "Accessibility callout: Deaf/HoH + Visually Impaired modes",
        "Testimonials (optional)",
        "Footer (solid, no gradients)"
      ],
      "hero_background": "Use Obsidian Veil gradient + noise overlay (<=20% viewport)."
    },
    "auth": {
      "layout": "Centered column but left-aligned text; card container max-w-md; include pb-24.",
      "must_have": [
        "Email/password",
        "Google OAuth button",
        "Forgot password link",
        "ARIA labels + data-testid"
      ]
    },
    "onboarding": {
      "pattern": "Stepper (Tabs or custom) with 3–4 steps: skill level, goals, accessibility prefs, finish.",
      "data_testid": "data-testid=\"onboarding-stepper\""
    },
    "dashboard": {
      "layout": "Top: quick stats + ‘Resume last drill’. Below: curriculum bento + progress snippet.",
      "data_testid": "data-testid=\"dashboard-quick-stats\""
    },
    "history_calendar": {
      "must": "Apply header collision fix; ensure month banner never clips; add pb-24.",
      "data_testid": "data-testid=\"history-calendar\""
    }
  },

  "instructions_to_main_agent": {
    "theme_application": [
      "Set app to dark mode by default (add class 'dark' on html/body/root).",
      "Replace default shadcn tokens in index.css with the HSL tokens above.",
      "Remove/avoid App.css centering patterns; do not use .App { text-align:center }.",
      "Implement a reusable <PageContainer> that applies px + pb-24 safe area.",
      "Ensure every interactive element includes data-testid (kebab-case).",
      "Use Cinzel only for section titles; everything else Space Grotesk.",
      "Crimson (#DC2626) only for active/focus/metrics; keep most UI neutral charcoal."
    ],
    "component_usage": [
      "Use shadcn Calendar for History Calendar; apply the 3-column header grid fix.",
      "Use shadcn Slider for Tone Lab; style track/range/thumb per tokens.",
      "Use Dialog for paywall; Drawer/Sheet for mobile navigation.",
      "Use Sonner for toasts."
    ],
    "performance": [
      "Waveform + tab stream should be Canvas where possible; keep React re-renders minimal.",
      "Avoid backdrop-filter on low-end devices for large areas; provide fallback solid surfaces."
    ]
  },

  "general_ui_ux_design_guidelines": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    "\n **GRADIENT RESTRICTION RULE**",
    "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc",
    "NEVER use dark gradients for logo, testimonial, footer etc",
    "NEVER let gradients cover more than 20% of the viewport.",
    "NEVER apply gradients to text-heavy content or reading areas.",
    "NEVER use gradients on small UI elements (<100px width).",
    "NEVER stack multiple gradient layers in the same viewport.",
    "\n **ENFORCEMENT RULE:**",
    "    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors",
    "\n **How and where to use:**",
    "   • Section backgrounds (not content backgrounds)",
    "   • Hero section header content. Eg: dark to light to dark color",
    "   • Decorative overlays and accent elements only",
    "   • Hero section with 2-3 mild color",
    "   • Gradients creation can be done for any angle say horizontal, vertical or diagonal",
    "\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**",
    "\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.",
    "\n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.",
    "\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.",
    "\n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly",
    "    Eg: - if it implies playful/energetic, choose a colorful scheme",
    "           - if it implies monochrome/minimal, choose a black–white/neutral scheme",
    "\n **Component Reuse:**",
    "\t- Prioritize using pre-existing components from src/components/ui when applicable",
    "\t- Create new components that match the style and conventions of existing components when needed",
    "\t- Examine existing components to understand the project's component patterns before creating new components",
    "\n **IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component",
    "\n **Best Practices:**",
    "\t- Use Shadcn/UI as the primary component library for consistency and accessibility",
    "\t- Import path: ./components/[component-name]",
    "\n **Export Conventions:**",
    "\t- Components MUST use named exports (export const ComponentName = ...)",
    "\t- Pages MUST use default exports (export default function PageName() {...})",
    "\n **Toasts:**",
    "  - Use `sonner` for toasts\"",
    "  - Sonner component are located in `/app/src/components/ui/sonner.tsx`",
    "\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
