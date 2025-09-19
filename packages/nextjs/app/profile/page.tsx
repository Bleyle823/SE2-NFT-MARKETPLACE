"use client";

import { useState } from "react";
import { 
  UserIcon,
  CalendarDaysIcon,
  TicketIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  WalletIcon,
  StarIcon,
  TrophyIcon,
  HeartIcon,
  ShareIcon
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", name: "Overview", icon: UserIcon },
    { id: "events", name: "My Events", icon: CalendarDaysIcon },
    { id: "tickets", name: "Tickets", icon: TicketIcon },
    { id: "analytics", name: "Analytics", icon: ChartBarIcon },
    { id: "settings", name: "Settings", icon: CogIcon },
  ];

  const userStats = {
    totalEvents: 23,
    ticketsPurchased: 45,
    ticketsSold: 12,
    totalSpent: "2,450 RVFY",
    totalEarned: "1,200 RVFY",
    rating: 4.8,
    reviews: 156,
    memberSince: "January 2023"
  };

  const recentActivity = [
    {
      id: 1,
      type: "purchase",
      title: "Purchased ticket for Crypto Conference 2024",
      date: "March 1, 2024",
      amount: "150 RVFY",
      icon: TicketIcon
    },
    {
      id: 2,
      type: "sale",
      title: "Sold ticket for NFT Art Gallery Opening",
      date: "February 28, 2024",
      amount: "75 RVFY",
      icon: ShareIcon
    },
    {
      id: 3,
      type: "event",
      title: "Created event: DeFi Workshop Series",
      date: "February 25, 2024",
      amount: null,
      icon: CalendarDaysIcon
    },
    {
      id: 4,
      type: "review",
      title: "Left review for Blockchain Music Festival",
      date: "February 20, 2024",
      amount: null,
      icon: StarIcon
    }
  ];

  const myEvents = [
    {
      id: 1,
      title: "DeFi Workshop Series",
      date: "April 20, 2024",
      location: "London, UK",
      status: "active",
      ticketsSold: 67,
      totalTickets: 100,
      revenue: "8,040 RVFY",
      image: "/api/placeholder/300/200"
    },
    {
      id: 2,
      title: "Crypto Art Exhibition",
      date: "January 20, 2024",
      location: "Tokyo, Japan",
      status: "completed",
      ticketsSold: 200,
      totalTickets: 200,
      revenue: "20,000 RVFY",
      image: "/api/placeholder/300/200"
    }
  ];

  const achievements = [
    {
      id: 1,
      title: "First Event Creator",
      description: "Created your first event",
      icon: TrophyIcon,
      earned: true,
      date: "January 15, 2023"
    },
    {
      id: 2,
      title: "Ticket Master",
      description: "Sold 100+ tickets",
      icon: TicketIcon,
      earned: true,
      date: "March 10, 2023"
    },
    {
      id: 3,
      title: "Top Rated",
      description: "Achieved 4.5+ average rating",
      icon: StarIcon,
      earned: true,
      date: "June 5, 2023"
    },
    {
      id: 4,
      title: "Community Builder",
      description: "Host 10+ successful events",
      icon: HeartIcon,
      earned: false,
      progress: 7
    }
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* User Info */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center space-x-4 mb-6">
            <div className="avatar">
              <div className="w-20 rounded-full bg-primary/20 flex items-center justify-center">
                <UserIcon className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">John Doe</h2>
              <p className="text-base-content/70">Event Creator & Enthusiast</p>
              <div className="flex items-center mt-2">
                <StarIcon className="h-4 w-4 text-warning mr-1" />
                <span className="font-medium">{userStats.rating}</span>
                <span className="text-sm text-base-content/70 ml-1">({userStats.reviews} reviews)</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <WalletIcon className="h-5 w-5 text-base-content/70" />
            <span className="text-sm text-base-content/70">Wallet Address:</span>
            <Address address="0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <CalendarDaysIcon className="h-8 w-8 mx-auto text-primary mb-2" />
            <h3 className="text-2xl font-bold text-primary">{userStats.totalEvents}</h3>
            <p className="text-sm text-base-content/70">Events Created</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <TicketIcon className="h-8 w-8 mx-auto text-secondary mb-2" />
            <h3 className="text-2xl font-bold text-secondary">{userStats.ticketsPurchased}</h3>
            <p className="text-sm text-base-content/70">Tickets Purchased</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <ChartBarIcon className="h-8 w-8 mx-auto text-accent mb-2" />
            <h3 className="text-2xl font-bold text-accent">{userStats.totalSpent}</h3>
            <p className="text-sm text-base-content/70">Total Spent</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <TrophyIcon className="h-8 w-8 mx-auto text-warning mb-2" />
            <h3 className="text-2xl font-bold text-warning">{userStats.totalEarned}</h3>
            <p className="text-sm text-base-content/70">Total Earned</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 bg-base-200 rounded-lg">
                <activity.icon className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-base-content/70">{activity.date}</p>
                </div>
                {activity.amount && (
                  <span className="text-sm font-bold text-primary">{activity.amount}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title mb-4">Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div key={achievement.id} className={`p-4 rounded-lg border-2 ${
                achievement.earned ? 'border-success bg-success/10' : 'border-base-300 bg-base-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <achievement.icon className={`h-8 w-8 ${
                    achievement.earned ? 'text-success' : 'text-base-content/50'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-medium">{achievement.title}</h4>
                    <p className="text-sm text-base-content/70">{achievement.description}</p>
                    {achievement.earned ? (
                      <p className="text-xs text-success mt-1">Earned on {achievement.date}</p>
                    ) : (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{achievement.progress}/10</span>
                        </div>
                        <progress 
                          className="progress progress-primary w-full" 
                          value={achievement.progress} 
                          max="10"
                        ></progress>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMyEvents = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Events</h2>
        <button className="btn btn-primary">
          <CalendarDaysIcon className="h-5 w-5 mr-2" />
          Create Event
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myEvents.map((event) => (
          <div key={event.id} className="card bg-base-100 shadow-xl">
            <figure className="h-48 bg-gradient-to-br from-primary/20 to-accent/20">
              <div className="flex items-center justify-center h-full">
                <CalendarDaysIcon className="h-16 w-16 text-primary/50" />
              </div>
            </figure>
            <div className="card-body">
              <h3 className="card-title">{event.title}</h3>
              <div className="space-y-2 text-sm text-base-content/70 mb-4">
                <p>📅 {event.date}</p>
                <p>📍 {event.location}</p>
              </div>
              <div className="stats stats-horizontal shadow">
                <div className="stat py-2">
                  <div className="stat-title text-xs">Tickets Sold</div>
                  <div className="stat-value text-sm">{event.ticketsSold}/{event.totalTickets}</div>
                </div>
                <div className="stat py-2">
                  <div className="stat-title text-xs">Revenue</div>
                  <div className="stat-value text-sm">{event.revenue}</div>
                </div>
              </div>
              <div className="card-actions mt-4">
                <button className="btn btn-primary btn-sm flex-1">Manage Event</button>
                <button className="btn btn-outline btn-sm">View Analytics</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title mb-4">Account Settings</h3>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Display Name</span>
              </label>
              <input type="text" className="input input-bordered" defaultValue="John Doe" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input type="email" className="input input-bordered" defaultValue="john@example.com" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bio</span>
              </label>
              <textarea className="textarea textarea-bordered" rows={3} defaultValue="Event creator and blockchain enthusiast"></textarea>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Event Updates</h4>
                <p className="text-sm text-base-content/70">Get notified about your events</p>
              </div>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Ticket Sales</h4>
                <p className="text-sm text-base-content/70">Notifications for ticket purchases</p>
              </div>
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Marketplace Updates</h4>
                <p className="text-sm text-base-content/70">New events and marketplace news</p>
              </div>
              <input type="checkbox" className="toggle toggle-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title mb-4">Security</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <p className="text-sm text-base-content/70">Add an extra layer of security</p>
              </div>
              <button className="btn btn-outline btn-sm">Enable</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Wallet Connection</h4>
                <p className="text-sm text-base-content/70">Manage connected wallets</p>
              </div>
              <button className="btn btn-outline btn-sm">Manage</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-100 p-1 mb-8 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && renderOverview()}
        {activeTab === "events" && renderMyEvents()}
        {activeTab === "tickets" && (
          <div className="text-center py-12">
            <TicketIcon className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Tickets</h3>
            <p className="text-base-content/70">View your tickets in the My Tickets page</p>
            <button className="btn btn-primary mt-4">View Tickets</button>
          </div>
        )}
        {activeTab === "analytics" && (
          <div className="text-center py-12">
            <ChartBarIcon className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p className="text-base-content/70">Detailed analytics coming soon</p>
          </div>
        )}
        {activeTab === "settings" && renderSettings()}
      </div>
    </div>
  );
};

export default ProfilePage;
