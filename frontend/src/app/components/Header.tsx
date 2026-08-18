import { Button } from "./ui/button";
import { Search, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-white font-bold">EL</span>
            </div>
            <span className="text-xl font-bold text-gray-900">EnglishLearn</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Home</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Courses</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Community</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 transition-colors">Blog</a>
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Search className="h-4 w-4" />
            </Button>
            
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost">Login</Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">Sign Up Free</Button>
            </div>

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}