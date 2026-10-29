with open("src/components/Layout.tsx", "r") as f:
    content = f.read()

# Fix analysisLinks
old_analysis = """                    <link.icon size={16} />
                    {link.name}
                  </Link>"""
new_analysis = """                    <div className="shrink-0"><link.icon size={16} /></div>
                    <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 md:hidden"}`}>{link.name}</span>
                  </Link>"""
content = content.replace(old_analysis, new_analysis)

# Also fix the button help at the bottom if it doesn't have it
old_help = """            <HelpCircle size={16} />
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 md:hidden"}`}>Help & Documentation</span>
          </button>"""
new_help = """            <div className="shrink-0"><HelpCircle size={16} /></div>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 md:hidden"}`}>Help & Documentation</span>
          </button>"""
content = content.replace(old_help, new_help)

with open("src/components/Layout.tsx", "w") as f:
    f.write(content)
