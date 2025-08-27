import React from 'react';

const SidebarDemo = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="heading-md">🎯 Collapsible Sidebar Features</h2>
        </div>
        
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">✨ Key Features</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  <strong>Collapsible:</strong> Click the chevron button to collapse/expand
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  <strong>Pinnable:</strong> Click the pin button to keep sidebar open
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                  <strong>Hover Expand:</strong> Hover over collapsed sidebar to expand
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                  <strong>Icon Only:</strong> Shows only icons when collapsed
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <strong>Tooltips:</strong> Hover over icons to see labels
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">🎮 How to Use</h3>
              <div className="space-y-2 text-slate-300">
                <p><strong>Desktop:</strong></p>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• Hover over the sidebar to expand it temporarily</li>
                  <li>• Click the pin icon to keep it permanently open</li>
                  <li>• Click the chevron to manually collapse/expand</li>
                  <li>• Hover over icons when collapsed to see tooltips</li>
                </ul>
                
                <p className="mt-3"><strong>Mobile:</strong></p>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• Tap the hamburger menu to open sidebar</li>
                  <li>• Tap outside or the X button to close</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3">💾 State Persistence</h3>
            <p className="text-slate-300 text-sm">
              Your sidebar preferences (collapsed/pinned state) are automatically saved to localStorage 
              and will be restored when you return to the application.
            </p>
          </div>
          
          <div className="bg-blue-600/20 rounded-lg p-4 border border-blue-600/30">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">🚀 Performance Benefits</h3>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• More screen real estate when collapsed</li>
              <li>• Smooth animations with CSS transitions</li>
              <li>• Responsive design for all screen sizes</li>
              <li>• Accessible with proper ARIA labels and keyboard navigation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarDemo;
