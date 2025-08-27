import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  PencilIcon, 
  BeakerIcon, 
  DocumentIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Prompt Engineering', href: '/editor', icon: PencilIcon },
  { name: 'Experiments', href: '/experiments', icon: BeakerIcon },
  { name: 'Model Cards', href: '/model-cards', icon: DocumentIcon },
];

const CollapsibleSidebar = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    const savedPinned = localStorage.getItem('sidebarPinned');
    
    if (savedCollapsed !== null) {
      setIsCollapsed(JSON.parse(savedCollapsed));
    }
    if (savedPinned !== null) {
      setIsPinned(JSON.parse(savedPinned));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(isPinned));
  }, [isPinned]);

  const shouldExpand = isPinned || isHovered;
  const isCollapsedState = isCollapsed && !shouldExpand;
  const sidebarWidth = isCollapsedState ? 'w-16' : 'w-64';
  const contentMargin = isCollapsedState ? 'ml-16' : 'ml-64';

  return (
    <div className="min-h-screen bg-black flex">
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileSidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-slate-900 border-r border-slate-800">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-white">🎯 Playground</h1>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop Collapsible Sidebar */}
      <div
        className={`hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${sidebarWidth}`}
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          {shouldExpand ? (
            <h1 className="text-xl font-bold text-white transition-opacity duration-300">
              🎯 Playground
            </h1>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            {/* Pin button - only show when expanded */}
            {shouldExpand && (
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  isPinned 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                <MapPinIcon className="h-4 w-4" />
              </button>
            )}
            
            {/* Collapse/Expand button - always show */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-4 w-4" />
              ) : (
                <ChevronLeftIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`sidebar-item group relative ${isActive ? 'active' : ''} ${!shouldExpand ? 'justify-center' : ''}`}
                title={!shouldExpand ? item.name : ''}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${!shouldExpand ? 'mx-0' : 'mr-3'}`} />
                {shouldExpand && (
                  <span className="transition-opacity duration-300">
                    {item.name}
                  </span>
                )}
                
                {/* Tooltip for collapsed state */}
                {!shouldExpand && (
                  <div className="sidebar-tooltip">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${contentMargin}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-800 bg-slate-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-400 hover:text-white lg:hidden transition-colors"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Add any header actions here */}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CollapsibleSidebar;
