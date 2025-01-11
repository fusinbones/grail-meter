import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography } from '@mui/material';

const TrendGraph = ({ title, trendData }) => {
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
    return (
      <Box sx={{ 
        width: '100%',
        height: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 3
      }}>
        <Typography variant="h6" color="text.secondary">
          No trend data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try uploading a different photo or checking back later
        </Typography>
      </Box>
    );
  }

  // Ensure data is properly formatted
  const formattedData = trendData.map(item => ({
    month: item.date || item.month,
    interest: typeof item.interest === 'number' ? item.interest : 
             typeof item.volume === 'number' ? item.volume : 0
  }));

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      minHeight: '350px',
      position: 'relative',
      px: 2,
      pb: 4,
      bgcolor: 'background.paper',
      borderRadius: 1
    }}>
      <ResponsiveContainer>
        <LineChart
          data={formattedData}
          margin={{
            top: 20,
            right: 25,
            left: 25,
            bottom: 50,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            tickMargin={15}
            height={60}
            interval={0}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            width={55}
            tickMargin={10}
          />
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Interest']}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="interest"
            stroke="#2196f3"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default TrendGraph;
