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
import { Box } from '@mui/material';

const TrendGraph = ({ title, trendData }) => {
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      minHeight: '300px',
      position: 'relative',
      px: 2
    }}>
      <ResponsiveContainer>
        <LineChart
          data={trendData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            tickMargin={12}
            height={50}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            width={50}
            tickMargin={8}
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
