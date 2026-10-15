/*
 * Adplug - Replayer for many OPL2/OPL3 audio file formats.
 * Copyright (C) 1999 - 2007 Simon Peter, <dn.tlp@gmx.net>, et al.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * player.h - Replayer base class, by Simon Peter <dn.tlp@gmx.net>
 */
/* Modified for type-pal on 2026-10-15: Removed unused file-provider and metadata interfaces for the browser kernel. */

#ifndef H_ADPLUG_PLAYER
#define H_ADPLUG_PLAYER


#include "opl.h"

class CPlayer {
public:
   CPlayer(Copl *newopl);
   virtual ~CPlayer();

   /***** Operational methods *****/
   void seek(unsigned long ms);

   virtual bool update() = 0;			// executes replay code for 1 tick
   virtual void rewind(int subsong = -1) = 0;	// rewinds to specified subsong
   virtual float getrefresh() = 0;			// returns needed timer refresh rate

   /***** Informational methods *****/
   unsigned long songlength(int subsong = -1);

   virtual unsigned int getsubsongs() { return 1; }

protected:
   Copl		*opl;	// our OPL chip

   static const unsigned short	note_table[12];	// standard adlib note table
   static const unsigned char	op_table[9];	// the 9 operators as expected by the OPL
};

#endif
