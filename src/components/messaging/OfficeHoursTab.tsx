import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Plus, Clock, Calendar, Trash2 } from 'lucide-react';
import { format, addDays, startOfWeek, setHours, setMinutes } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface OfficeHour {
  id: string;
  supervisor_id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

interface Booking {
  id: string;
  office_hour_id: string;
  student_id: string;
  booking_date: string;
  start_time: string;
  status: string;
  notes: string | null;
  student_name?: string;
}

export function OfficeHoursTab() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [officeHours, setOfficeHours] = useState<OfficeHour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<OfficeHour | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state for supervisor creating office hours
  const [formDay, setFormDay] = useState('1');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('12:00');
  const [formDuration, setFormDuration] = useState('30');
  const [formTitle, setFormTitle] = useState('Office Hours');

  useEffect(() => {
    fetchData();
  }, [userRole]);

  const fetchData = async () => {
    setLoading(true);
    const { data: hours } = await supabase
      .from('office_hours')
      .select('*')
      .order('day_of_week');

    if (hours) setOfficeHours(hours);

    // Fetch bookings
    if (userRole === 'supervisor') {
      const hourIds = hours?.map(h => h.id) || [];
      if (hourIds.length > 0) {
        const { data: bks } = await supabase
          .from('office_hour_bookings')
          .select('*')
          .in('office_hour_id', hourIds)
          .order('booking_date');

        if (bks) {
          // Get student names
          const studentIds = [...new Set(bks.map(b => b.student_id))];
          const { data: students } = studentIds.length > 0
            ? await supabase.from('students').select('id, user_id').in('id', studentIds)
            : { data: [] };
          const userIds = students?.map(s => s.user_id) || [];
          const { data: profiles } = userIds.length > 0
            ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
            : { data: [] };

          const enriched = bks.map(b => {
            const student = students?.find(s => s.id === b.student_id);
            const profile = profiles?.find(p => p.id === student?.user_id);
            return { ...b, student_name: profile?.full_name || 'Student' };
          });
          setBookings(enriched);
        }
      }
    } else {
      // Student: fetch own bookings
      const { data: myStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      if (myStudent) {
        const { data: bks } = await supabase
          .from('office_hour_bookings')
          .select('*')
          .eq('student_id', myStudent.id)
          .order('booking_date');

        if (bks) setBookings(bks);
      }
    }

    setLoading(false);
  };

  const handleCreateHours = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('office_hours').insert({
      supervisor_id: user.id,
      title: formTitle,
      day_of_week: parseInt(formDay),
      start_time: formStart,
      end_time: formEnd,
      slot_duration_minutes: parseInt(formDuration),
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Office hours created' });
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteHours = async (id: string) => {
    const { error } = await supabase.from('office_hours').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Office hours removed' });
      fetchData();
    }
  };

  const getAvailableSlots = (oh: OfficeHour) => {
    const slots: string[] = [];
    const [startH, startM] = oh.start_time.split(':').map(Number);
    const [endH, endM] = oh.end_time.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    for (let m = startMin; m + oh.slot_duration_minutes <= endMin; m += oh.slot_duration_minutes) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
    return slots;
  };

  const getNextDate = (dayOfWeek: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    let daysAhead = dayOfWeek - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    const next = addDays(today, daysAhead);
    return format(next, 'yyyy-MM-dd');
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !selectedDate || !selectedTime || !user) return;
    setSaving(true);

    const { data: myStudent } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!myStudent) {
      toast({ title: 'Error', description: 'Student record not found', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('office_hour_bookings').insert({
      office_hour_id: selectedSlot.id,
      student_id: myStudent.id,
      booking_date: selectedDate,
      start_time: selectedTime,
      notes: bookingNotes || null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message.includes('unique') ? 'Slot already booked' : error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Booked!', description: 'Office hour slot booked successfully' });
      setBookDialogOpen(false);
      setBookingNotes('');
      fetchData();
    }
    setSaving(false);
  };

  const openBookDialog = (oh: OfficeHour) => {
    setSelectedSlot(oh);
    setSelectedDate(getNextDate(oh.day_of_week));
    setSelectedTime('');
    setBookingNotes('');
    setBookDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {userRole === 'supervisor' && (
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Office Hours
          </Button>
        </div>
      )}

      {officeHours.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Office Hours</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {userRole === 'supervisor' ? 'Set up your office hours for students to book' : 'No office hours available yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {officeHours.map(oh => {
            const slots = getAvailableSlots(oh);
            const ohBookings = bookings.filter(b => b.office_hour_id === oh.id);

            return (
              <Card key={oh.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{oh.title}</CardTitle>
                    {userRole === 'supervisor' && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteHours(oh.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{DAYS[oh.day_of_week]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{oh.start_time.slice(0, 5)} – {oh.end_time.slice(0, 5)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{oh.slot_duration_minutes} min slots · {slots.length} available</p>

                  {ohBookings.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground">Upcoming bookings</p>
                      {ohBookings.slice(0, 3).map(b => (
                        <div key={b.id} className="flex items-center justify-between text-xs">
                          <span>{b.booking_date} at {b.start_time.slice(0, 5)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {userRole === 'supervisor' ? b.student_name : b.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {userRole === 'student' && (
                    <Button className="w-full mt-2" size="sm" onClick={() => openBookDialog(oh)}>
                      Book Slot
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Supervisor: Create Office Hours Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Office Hours</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={formDay} onValueChange={setFormDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={i.toString()}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Slot Duration (minutes)</Label>
              <Select value={formDuration} onValueChange={setFormDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateHours} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student: Book Slot Dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Office Hour</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            {selectedSlot && (
              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {getAvailableSlots(selectedSlot).map(slot => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={bookingNotes}
                onChange={e => setBookingNotes(e.target.value)}
                placeholder="What would you like to discuss?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBookSlot} disabled={saving || !selectedTime}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
