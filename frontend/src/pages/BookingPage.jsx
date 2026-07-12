import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Plus, Search, X, CheckCircle, MapPin, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default function BookingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedResource, setSelectedResource] = useState('');
  const [bookingDate, setBookingDate] = useState(today);
  const [bookingTime, setBookingTime] = useState({ start: '', end: '' });

  const resources = [
    { id: 'res-1', name: 'Conference Room A', type: 'Room', capacity: '12 People' },
    { id: 'res-2', name: 'Conference Room B', type: 'Room', capacity: '6 People' },
    { id: 'res-3', name: 'Ford Transit Van', type: 'Vehicle', capacity: 'Cargo' },
  ];

  const [bookings, setBookings] = useState([
    { id: 1, resource: 'Conference Room A', requestedBy: 'Marcus Cole', date: today, startTime: '10:00', endTime: '11:30', status: 'Completed' },
    { id: 2, resource: 'Ford Transit Van', requestedBy: 'Logistics Team', date: today, startTime: '13:00', endTime: '16:00', status: 'Ongoing' },
    { id: 3, resource: 'Conference Room B', requestedBy: 'Alicia Dean', date: today, startTime: '15:00', endTime: '16:00', status: 'Upcoming' },
  ]);

  // Dynamic filter for search bar
  const filteredBookings = bookings.filter(b => 
    b.resource.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.requestedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const format12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const selectedResourceName = resources.find(r => r.id === selectedResource)?.name;
  const isConflict = selectedResourceName && bookingTime.start && bookingTime.end && bookings.some(b => 
    b.resource === selectedResourceName && b.date === bookingDate && bookingTime.start < b.endTime && bookingTime.end > b.startTime && b.status !== 'Cancelled'
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isConflict) return; 
    setBookings([{ id: Date.now(), resource: selectedResourceName, requestedBy: 'You', date: bookingDate, startTime: bookingTime.start, endTime: bookingTime.end, status: 'Upcoming' }, ...bookings]);
    setIsModalOpen(false);
  };

  const cancelBooking = (id) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'Cancelled' } : b));
  };

  return (
    <div className="relative mx-auto max-w-7xl pb-12">
      <PageHeader eyebrow="Scheduling" title="Resource Bookings" actions={[<Button key="book" variant="primary" onClick={() => setIsModalOpen(true)}><Plus size={18} className="mr-2" /> New Booking</Button>]} />
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_350px]">
        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Calendar size={18} className="text-violet-600" /> Today's Schedule</h2>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search room or person..." className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 rounded-full bg-slate-100 p-2 text-slate-500"><Clock size={18} /></div>
                    <div>
                      <h4 className="font-medium text-slate-900">{booking.resource}</h4>
                      <p className="text-sm text-slate-500">{booking.date} • {format12Hour(booking.startTime)} - {format12Hour(booking.endTime)}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400"><MapPin size={12} /> Requested by {booking.requestedBy}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={booking.status === 'Ongoing' ? 'violet' : booking.status === 'Upcoming' ? 'sky' : booking.status === 'Completed' ? 'success' : 'neutral'}>{booking.status}</Badge>
                    {booking.status === 'Upcoming' && <Button variant="ghost" onClick={() => cancelBooking(booking.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">Cancel</Button>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 font-semibold text-slate-900">Your Usage</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-violet-50 p-4">
                <div className="flex items-center gap-3 text-violet-700"><CheckCircle size={20} /><span className="font-medium">Completed</span></div>
                <span className="text-xl font-bold text-violet-700">{bookings.filter(b => b.status === 'Completed').length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3 text-slate-600"><Calendar size={20} /><span className="font-medium">Upcoming</span></div>
                <span className="text-xl font-bold text-slate-900">{bookings.filter(b => b.status === 'Upcoming').length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Book a Resource">
        {/* Same form as before */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Select Resource</label>
            <select required value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option value="" disabled>Choose...</option>
              {resources.map(res => <option key={res.id} value={res.id}>{res.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Time</label>
              <input type="time" required value={bookingTime.start} onChange={(e) => setBookingTime({ ...bookingTime, start: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End Time</label>
              <input type="time" required value={bookingTime.end} min={bookingTime.start} onChange={(e) => setBookingTime({ ...bookingTime, end: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
            </div>
          </div>
          {isConflict && <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-sm font-medium text-red-700">Overlap Detected! Please adjust time.</p></div>}
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className={isConflict ? "opacity-50 cursor-not-allowed" : ""}>Confirm</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}