import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  Mail, 
  MapPin, 
  Phone,
  Globe
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 lg:px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-white font-bold">EL</span>
              </div>
              <span className="text-xl font-bold">EnglishLearn</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Empowering millions of learners worldwide to master English through interactive, 
              AI-powered lessons and a supportive global community.
            </p>
            <div className="flex space-x-4">
              <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Our Story</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Press</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Success Stories</a></li>
            </ul>
          </div>

          {/* Courses & Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Courses & Support</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">All Courses</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Business English</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Test Preparation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Support</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Community Forum</a></li>
            </ul>
          </div>

          {/* Newsletter & Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stay Connected</h3>
            <p className="text-gray-400 text-sm">
              Get the latest learning tips, course updates, and exclusive offers.
            </p>
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              />
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Mail className="h-4 w-4 mr-2" />
                Subscribe
              </Button>
            </div>
            
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>San Francisco, CA</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="h-4 w-4" />
                <span>support@englishlearn.com</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-gray-800" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-wrap gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            <a href="#" className="hover:text-white transition-colors">Accessibility</a>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Globe className="h-4 w-4 mr-2" />
              English
            </Button>
            <span className="text-sm text-gray-400">
              © 2024 EnglishLearn. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}