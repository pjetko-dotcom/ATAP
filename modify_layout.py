import re

with open('src/components/Layout.tsx', 'r') as f:
    content = f.read()

# 1. Imports
if 'Pin' not in content:
    content = content.replace('X, Menu', 'X, Menu, Pin, PinOff, ChevronRight')

# 2. Add state
state_code = """  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sidebar state
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isExpanded = isSidebarLocked || isSidebarHovered;"""
content = re.sub(r'  const \[isHelpOpen, setIsHelpOpen\] = useState\(false\);\n  const \[isMobileMenuOpen, setIsMobileMenuOpen\] = useState\(false\);', state_code, content)

# 3. Modify structure around aside
aside_regex = r'      \{\/\* Sidebar Navigation \*\/}([\s\S]*?)      \{\/\* Main Content Area \*\/}'

def replace_aside(match):
    original_aside = match.group(1)
    
    # We will build the new aside structure.
    
    # Header inside aside
    header_old = """          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shrink-0">
              <Shield size={20} />
            </div>
            <h1 className="text-white font-bold text-lg tracking-tight uppercase">ATAP V5.0</h1>
          </div>"""
          
    # If the exact text isn't found because shrink-0 isn't there, let's use regex
    new_header = """          <div className="flex items-center justify-between mb-8 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shrink-0">
                <Shield size={20} />
              </div>
              <h1 className={`text-white font-bold text-lg tracking-tight uppercase whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 md:hidden'}`}>ATAP V5.0</h1>
            </div>
            {isExpanded && (
              <button 
                onClick={() => setIsSidebarLocked(!isSidebarLocked)}
                className="hidden md:flex text-slate-400 hover:text-white p-1 rounded transition-colors"
                title={isSidebarLocked ? "Unlock Sidebar" : "Lock Sidebar"}
              >
                {isSidebarLocked ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
            )}
          </div>"""
    
    modified_aside = re.sub(r'          <div className="flex items-center gap-2 mb-8">[\s\S]*?</h1>\n          </div>', new_header, original_aside)
    
    # For link items, hide text when not expanded
    modified_aside = re.sub(r'>\n                <link\.icon size=\{16\} />\n                \{link\.name\}\n              </Link>',
                            r'>\n                <div className="shrink-0"><link.icon size={16} /></div>\n                <span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 md:hidden"}`}>{link.name}</span>\n              </Link>', modified_aside)

    # For section titles, hide text when not expanded
    modified_aside = re.sub(r'<div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase">Analysis Lifecycle</div>',
                            r'<div className={`pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 md:hidden"}`}>Analysis Lifecycle</div>', modified_aside)
    modified_aside = re.sub(r'<div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase">Reporting</div>',
                            r'<div className={`pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 md:hidden"}`}>Reporting</div>', modified_aside)
                            
    # For bottom sections
    modified_aside = re.sub(r'Help & Documentation\n          </button>', 
                            r'<span className={`whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 md:hidden"}`}>Help & Documentation</span>\n          </button>', modified_aside)
                            
    modified_aside = re.sub(r'<div className="text-xs">\n              <p className="text-white font-medium">Erik Novák</p>\n              <p className="text-slate-500">Security Architect</p>\n            </div>',
                            r'<div className={`text-xs whitespace-nowrap transition-opacity duration-300 ${isExpanded ? "opacity-100" : "opacity-0 md:hidden"}`}>\n              <p className="text-white font-medium">Erik Novák</p>\n              <p className="text-slate-500">Security Architect</p>\n            </div>', modified_aside)
                            
    # Now fix the aside classes and add the spacer
    
    new_aside_wrapper = f"""      {{/* Desktop Sidebar Spacer (reserves space in normal flow) */}}
      <div className={{`hidden md:block shrink-0 transition-all duration-300 ${{isSidebarLocked ? 'w-64' : 'w-16'}}`}} />

      {{/* Sidebar Navigation */}}
      <aside 
        onMouseEnter={{() => setIsSidebarHovered(true)}}
        onMouseLeave={{() => setIsSidebarHovered(false)}}
        className={{`
          fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 
          transform transition-all duration-300 ease-in-out
          ${{isMobileMenuOpen ? "translate-x-0 w-64 shadow-2xl flex" : "-translate-x-full md:translate-x-0 md:flex"}}
          ${{isExpanded ? 'md:w-64' : 'md:w-16'}}
        `}}
      >
        <div className="p-6 overflow-y-auto overflow-x-hidden flex-1">
"""
    # Replace `<aside className="...">` and `<div className="p-6 overflow-y-auto">`
    modified_aside = re.sub(r'<aside className=\{`[\s\S]*?`\}>\n        <div className="p-6 overflow-y-auto">', new_aside_wrapper, modified_aside)
    
    return modified_aside + "      {/* Main Content Area */}"

content = re.sub(aside_regex, replace_aside, content)

with open('src/components/Layout.tsx', 'w') as f:
    f.write(content)
